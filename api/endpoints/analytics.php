<?php
/*
 * Alumini-Path :: analytics, reporting and notifications.
 *
 * Every number the dashboard shows comes from database queries and views.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/auth.php';

/*
 * Builds the filter used by the analytics queries.
 *
 * Returns an array with the SQL condition and the values for it.
 */
function analytics_filter()
{
    $year = query_int('graduationYear', 0);
    $department = query_int('department', 0);
    $period = query_value('period');
    $condition = '1 = 1';
    $types = '';
    $params = array();

    if ($year > 0) {
        $condition .= ' AND p.`graduation_year` = ?';
        $types .= 'i';
        $params[] = $year;
    }

    if ($department > 0) {
        $condition .= ' AND p.`department_id` = ?';
        $types .= 'i';
        $params[] = $department;
    }

    if ($period !== '') {
        $condition .= ' AND DATE_FORMAT(p.`created_at`, \'%Y-%m\') = ?';
        $types .= 's';
        $params[] = $period;
    }

    return array(
        'condition' => $condition,
        'types'     => $types,
        'params'    => $params,
        'period'    => $period,
    );
}

/*
 * Prevents spreadsheet formula injection when exporting CSV cells.
 */
function safe_csv_cell($value)
{
    $text = (string) $value;

    if ($text !== '' && in_array($text[0], array('=', '+', '-', '@'), true)) {
        return "'" . $text;
    }

    return $text;
}

/*
 * Returns the summary numbers shown on the analytics cards.
 */
function endpoint_analytics_summary()
{
    require_permission('analytics.view');

    $filter = analytics_filter();

    $totals = db_one(
        'SELECT COUNT(*) AS `total_alumni`,
                SUM(CASE WHEN p.`graduation_year` >= ' . (int) date('Y') . ' THEN 1 ELSE 0 END) AS `recent_graduates`,
                SUM(CASE WHEN p.`mentorship_available` = 1 THEN 1 ELSE 0 END) AS `available_mentors`,
                SUM(CASE WHEN p.`current_company` IS NOT NULL AND p.`current_company` <> \'\' THEN 1 ELSE 0 END) AS `employed`
           FROM `alumni_profiles` p
          WHERE ' . $filter['condition'],
        $filter['types'],
        $filter['params']
    );

    $jobs = db_one(
        'SELECT COUNT(*) AS `total_jobs`,
                SUM(CASE WHEN j.`status` = \'open\' THEN 1 ELSE 0 END) AS `open_jobs`,
                SUM(CASE WHEN j.`status` = \'open\' AND j.`application_deadline` >= CURDATE() THEN 1 ELSE 0 END) AS `closing_soon`
           FROM `jobs` j
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = j.`posted_by`
          WHERE ' . $filter['condition'],
        $filter['types'],
        $filter['params']
    );

    $applications = db_value('SELECT COUNT(*) FROM `job_applications`');
    $events = db_value('SELECT COUNT(*) FROM `events` WHERE `event_date` >= CURDATE()');
    $connections = db_value('SELECT COUNT(*) FROM `connections` WHERE `status` = \'accepted\'');
    $mentorship_completed = db_value('SELECT COUNT(*) FROM `mentorship_sessions` WHERE `status` = \'completed\'');

    reply_ok(array(
        'alumni' => array(
            'total'             => isset($totals['total_alumni']) ? (int) $totals['total_alumni'] : 0,
            'recent_graduates'  => isset($totals['recent_graduates']) ? (int) $totals['recent_graduates'] : 0,
            'available_mentors' => isset($totals['available_mentors']) ? (int) $totals['available_mentors'] : 0,
            'employed'          => isset($totals['employed']) ? (int) $totals['employed'] : 0,
        ),
        'jobs' => array(
            'total'        => isset($jobs['total_jobs']) ? (int) $jobs['total_jobs'] : 0,
            'open'         => isset($jobs['open_jobs']) ? (int) $jobs['open_jobs'] : 0,
            'closing_soon' => isset($jobs['closing_soon']) ? (int) $jobs['closing_soon'] : 0,
            'applications' => (int) $applications,
        ),
        'events' => array(
            'upcoming' => (int) $events,
        ),
        'engagement' => array(
            'accepted_connections' => (int) $connections,
            'completed_sessions'   => (int) $mentorship_completed,
        ),
    ));
}

/*
 * Returns all eight analytics chart series, filtered dynamically when
 * graduationYear, department, or period filters are supplied.
 */
function endpoint_analytics_charts()
{
    require_permission('analytics.view');

    $filter = analytics_filter();
    $has_filter = $filter['condition'] !== '1 = 1';

    if ($has_filter) {
        $by_year = db_all(
            'SELECT p.`graduation_year`, COUNT(*) AS `alumni_count`
               FROM `alumni_profiles` p
               JOIN `users` u ON u.`id` = p.`user_id`
              WHERE u.`status` = \'active\' AND p.`graduation_year` IS NOT NULL AND ' . $filter['condition'] . '
              GROUP BY p.`graduation_year`
              ORDER BY p.`graduation_year`',
            $filter['types'],
            $filter['params']
        );

        $by_department = db_all(
            'SELECT d.`id` AS `department_id`, d.`name` AS `department_name`, COUNT(p.`user_id`) AS `alumni_count`
               FROM `departments` d
               LEFT JOIN `alumni_profiles` p ON p.`department_id` = d.`id` AND ' . $filter['condition'] . '
              GROUP BY d.`id`, d.`name`
              ORDER BY `alumni_count` DESC',
            $filter['types'],
            $filter['params']
        );

        $by_sector = db_all(
            'SELECT s.`id` AS `sector_id`, s.`name` AS `sector_name`, COUNT(p.`user_id`) AS `alumni_count`
               FROM `sectors` s
               LEFT JOIN `alumni_profiles` p ON p.`sector_id` = s.`id` AND ' . $filter['condition'] . '
              GROUP BY s.`id`, s.`name`
              ORDER BY `alumni_count` DESC',
            $filter['types'],
            $filter['params']
        );
    } else {
        $by_year = db_all('SELECT * FROM `v_alumni_by_graduation_year`');
        $by_department = db_all('SELECT * FROM `v_alumni_by_department`');
        $by_sector = db_all('SELECT * FROM `v_employment_by_sector`');
    }

    if ($filter['period'] !== '') {
        $job_trends = db_all(
            'SELECT * FROM `v_job_posting_trends` WHERE `period` = ?',
            's',
            array($filter['period'])
        );
    } else {
        $job_trends = db_all('SELECT * FROM `v_job_posting_trends`');
    }

    $application_outcomes = db_all('SELECT * FROM `v_job_application_outcomes`');

    $mentorship = db_all(
        'SELECT m.`mentor_id`, u.`full_name` AS `mentor_name`, m.`requests_received`, m.`requests_accepted`,
                m.`requests_rejected`,
                (SELECT COUNT(*) FROM `mentorship_sessions` s
                   JOIN `mentorship_requests` r2 ON r2.`id` = s.`mentorship_request_id`
                  WHERE r2.`mentor_id` = m.`mentor_id` AND s.`status` = \'completed\') AS `sessions_completed`
           FROM `v_mentorship_activity` m
           JOIN `users` u ON u.`id` = m.`mentor_id`'
    );

    $event_stats = db_all('SELECT * FROM `v_event_registration_stats`');
    $engagement = db_all('SELECT * FROM `v_engagement_stats` ORDER BY `posts_count` DESC, `comments_count` DESC LIMIT 20');

    reply_ok(array(
        'byGraduationYear'    => $by_year,
        'byDepartment'        => $by_department,
        'bySector'            => $by_sector,
        'jobPostingTrends'    => $job_trends,
        'applicationOutcomes' => $application_outcomes,
        'mentorshipActivity'  => $mentorship,
        'eventStats'          => $event_stats,
        'engagement'          => $engagement,
    ));
}

/*
 * Exports a report as CSV so it can be opened safely in a spreadsheet.
 */
function endpoint_analytics_export()
{
    $user = require_permission('reports.export');

    $report = query_value('report', 'alumni');

    if ($report === 'jobs') {
        $rows = db_all('SELECT * FROM `v_job_application_outcomes`');
        $columns = array('job_title', 'company', 'total_applications', 'pending', 'reviewed', 'shortlisted', 'rejected', 'accepted');
    } elseif ($report === 'events') {
        $rows = db_all('SELECT * FROM `v_event_registration_stats`');
        $columns = array('event_title', 'category', 'event_date', 'available_seats', 'seats_taken', 'registered', 'attended', 'absent', 'cancelled');
    } elseif ($report === 'engagement') {
        $rows = db_all('SELECT * FROM `v_engagement_stats`');
        $columns = array('full_name', 'posts_count', 'comments_count', 'likes_count', 'connections_count', 'mentorship_sessions_completed');
    } else {
        $report = 'alumni';
        $rows = db_all('SELECT * FROM `v_alumni_by_department`');
        $columns = array('department_name', 'alumni_count');
    }

    audit_log_action($user['id'], 'analytics.exported', 'reports', null, $report);

    $file_name = 'alumni-path-' . $report . '-' . date('Y-m-d') . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $file_name . '"');
    header('X-Content-Type-Options: nosniff');

    $output = fopen('php://output', 'w');
    fputcsv($output, $columns);

    foreach ($rows as $row) {
        $line = array();

        foreach ($columns as $column) {
            $line[] = safe_csv_cell(isset($row[$column]) ? $row[$column] : '');
        }

        fputcsv($output, $line);
    }

    fclose($output);
    exit;
}

/*
 * Shows the recent activity list for administrators.
 */
function endpoint_activity_log()
{
    require_permission('analytics.view');

    $logs = db_all(
        'SELECT a.*, u.`full_name` AS `actor_name` FROM `audit_log` a
           LEFT JOIN `users` u ON u.`id` = a.`actor_id`
          ORDER BY a.`created_at` DESC
          LIMIT 100'
    );

    reply_ok(array('logs' => $logs));
}

/*
 * Returns the signed in user's notifications.
 */
function endpoint_notifications()
{
    $user = require_login();

    $items = db_all(
        'SELECT * FROM `notifications` WHERE `user_id` = ? ORDER BY `created_at` DESC LIMIT 40',
        'i',
        array($user['id'])
    );

    $unread = (int) db_value(
        'SELECT COUNT(*) FROM `notifications` WHERE `user_id` = ? AND `read_at` IS NULL',
        'i',
        array($user['id'])
    );

    reply_ok(array('notifications' => $items, 'unread' => $unread));
}

/*
 * Marks all notifications for the signed in user as read.
 */
function endpoint_mark_notifications_read()
{
    $user = require_login();
    db_query('UPDATE `notifications` SET `read_at` = NOW() WHERE `user_id` = ? AND `read_at` IS NULL', 'i', array($user['id']));
    reply_ok(null, 'Notifications marked as read.');
}
