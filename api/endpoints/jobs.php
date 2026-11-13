<?php
/*
 * Alumini-Path :: job postings, applications and applicant tracking.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/validation.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/uploads.php';

/*
 * Lists job openings with filters and pagination.
 */
function endpoint_jobs()
{
    $user = require_login();

    $search = query_value('search');
    $sector = query_int('sector', 0);
    $type = query_value('type');
    $status = query_value('status', 'open');
    $page = query_int('page', 1);
    $page_size = query_int('pageSize', 10);

    if ($page < 1) {
        $page = 1;
    }
    if ($page_size < 1 || $page_size > 100) {
        $page_size = 10;
    }

    $where = array('1 = 1');
    $types = '';
    $params = array();

    if ($search !== '') {
        $where[] = '(j.`title` LIKE ? OR j.`company` LIKE ? OR j.`description` LIKE ?)';
        $like = '%' . $search . '%';
        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if ($sector > 0) {
        $where[] = 'j.`sector_id` = ?';
        $types .= 'i';
        $params[] = $sector;
    }

    if ($type !== '') {
        $where[] = 'j.`employment_type` = ?';
        $types .= 's';
        $params[] = $type;
    }

    if ($status !== '' && $status !== 'all') {
        $where[] = 'j.`status` = ?';
        $types .= 's';
        $params[] = $status;
    }

    $where_sql = implode(' AND ', $where);

    $total = (int) db_value(
        'SELECT COUNT(*) FROM `jobs` j WHERE ' . $where_sql,
        $types,
        $params
    );

    $offset = ($page - 1) * $page_size;

    $types .= 'ii';
    $params[] = $page_size;
    $params[] = $offset;

    $jobs = db_all(
        'SELECT j.*, s.`name` AS `sector_name`, u.`full_name` AS `posted_by_name`, r.`code` AS `posted_by_role`,
                (SELECT COUNT(*) FROM `job_applications` a WHERE a.`job_id` = j.`id`) AS `application_count`
           FROM `jobs` j
           LEFT JOIN `sectors` s ON s.`id` = j.`sector_id`
           JOIN `users` u ON u.`id` = j.`posted_by`
           JOIN `roles` r ON r.`id` = u.`role_id`
          WHERE ' . $where_sql . '
          ORDER BY j.`published_at` DESC, j.`id` DESC
          LIMIT ? OFFSET ?',
        $types,
        $params
    );

    foreach ($jobs as $index => $job) {
        $documents = db_all(
            'SELECT f.`id`, f.`original_name`, f.`mime_type`, f.`size_bytes`
               FROM `job_documents` jd
               JOIN `file_uploads` f ON f.`id` = jd.`file_upload_id`
              WHERE jd.`job_id` = ?',
            'i',
            array($job['id'])
        );

        foreach ($documents as $doc_index => $doc) {
            $documents[$doc_index]['download_url'] = 'api/files.php?id=' . (int) $doc['id'];
        }

        $my_application = db_one(
            'SELECT `id`, `status`, `applied_at` FROM `job_applications` WHERE `job_id` = ? AND `applicant_id` = ? LIMIT 1',
            'ii',
            array($job['id'], $user['id'])
        );

        $jobs[$index]['documents'] = $documents;
        $jobs[$index]['my_application'] = $my_application;
    }

    reply_ok(array(
        'jobs'     => $jobs,
        'total'    => $total,
        'page'     => $page,
        'pageSize' => $page_size,
    ));
}

/*
 * Shows one job with its documents and the signed in user's application.
 */
function endpoint_job($id)
{
    $user = require_login();

    $job = db_one(
        'SELECT j.*, s.`name` AS `sector_name`, u.`full_name` AS `posted_by_name`
           FROM `jobs` j
           LEFT JOIN `sectors` s ON s.`id` = j.`sector_id`
           JOIN `users` u ON u.`id` = j.`posted_by`
          WHERE j.`id` = ?',
        'i',
        array($id)
    );

    if ($job === null) {
        reply_error('That job was not found.', 404);
    }

    $documents = db_all(
        'SELECT f.`id`, f.`original_name`, f.`mime_type`, f.`size_bytes`
           FROM `job_documents` jd
           JOIN `file_uploads` f ON f.`id` = jd.`file_upload_id`
          WHERE jd.`job_id` = ?',
        'i',
        array($id)
    );

    $my_application = db_one(
        'SELECT * FROM `job_applications` WHERE `job_id` = ? AND `applicant_id` = ? LIMIT 1',
        'ii',
        array($id, $user['id'])
    );

    reply_ok(array(
        'job'            => $job,
        'documents'      => $documents,
        'my_application' => $my_application,
    ));
}

/*
 * Publishes a new job opening. The brief of the job can be uploaded as
 * a PDF or image.
 */
function endpoint_create_job()
{
    $user = require_permission('jobs.publish');
    $input = read_input();
    $errors = array();

    check_required($input, 'title', 'Job title', $errors);
    check_required($input, 'company', 'Company', $errors);
    check_required($input, 'location', 'Location', $errors);
    check_required($input, 'employmentType', 'Employment type', $errors);
    check_choice($input, 'employmentType', 'Employment type', array('full_time', 'part_time', 'internship', 'contract', 'temporary', 'volunteer'), $errors);
    check_required($input, 'description', 'Description', $errors);
    check_email($input, 'contactEmail', 'Contact email', $errors);
    check_date($input, 'applicationDeadline', 'Application deadline', $errors);
    check_not_before($input, 'applicationDeadline', date('Y-m-d'), 'Application deadline', $errors);
    check_number($input, 'salaryMin', 'Minimum salary', 0, 1000000000, $errors);
    check_number($input, 'salaryMax', 'Maximum salary', 0, 1000000000, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $sector_id = null;

    if (input_value($input, 'sector') !== '') {
        $sector_id = db_value('SELECT `id` FROM `sectors` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'sector')));
    }

    $salary_min = input_int($input, 'salaryMin');
    $salary_max = input_int($input, 'salaryMax');

    if ($salary_min !== null && $salary_max !== null && $salary_max < $salary_min) {
        reply_error('The maximum salary cannot be lower than the minimum salary.', 422);
    }

    $uploaded_file = null;
    if (isset($_FILES['document']) && $_FILES['document']['error'] !== UPLOAD_ERR_NO_FILE) {
        $uploaded_file = save_uploaded_file($_FILES['document'], 'job_document', $user['id']);
    }

    $deadline = input_value($input, 'applicationDeadline');
    if ($deadline === '') {
        $deadline = null;
    }

    $job_id = db_insert(
        'INSERT INTO `jobs`
            (`posted_by`, `title`, `company`, `sector_id`, `location`, `employment_type`,
             `salary_min`, `salary_max`, `salary_currency`, `application_deadline`,
             `description`, `qualifications`, `application_instructions`, `contact_email`, `status`, `published_at`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'open\', NOW())',
        'ississiissssss',
        array(
            $user['id'],
            input_value($input, 'title'),
            input_value($input, 'company'),
            $sector_id,
            input_value($input, 'location'),
            input_value($input, 'employmentType'),
            $salary_min,
            $salary_max,
            input_value($input, 'salaryCurrency', 'RWF'),
            $deadline,
            input_value($input, 'description'),
            input_value($input, 'qualifications'),
            input_value($input, 'applicationInstructions'),
            strtolower(input_value($input, 'contactEmail')),
        )
    );

    if ($uploaded_file !== null) {
        db_query(
            'INSERT INTO `job_documents` (`job_id`, `file_upload_id`, `description`) VALUES (?, ?, ?)',
            'iis',
            array($job_id, $uploaded_file['id'], input_value($input, 'documentDescription'))
        );
    }

    reply_ok(array('job_id' => $job_id), 'Opportunity published.', 201);
}

/*
 * Applies to a job. The applicant can upload a CV in the same request.
 */
function endpoint_apply_to_job($id)
{
    $user = require_permission('jobs.apply');
    $input = read_input();
    $errors = array();

    check_required($input, 'coverNote', 'Cover note', $errors);
    check_text_length($input, 'coverNote', 'Cover note', 2000, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $job = db_one('SELECT * FROM `jobs` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($job === null) {
        reply_error('That job was not found.', 404);
    }

    if ($job['status'] !== 'open') {
        reply_error('That job is no longer accepting applications.', 422);
    }

    if ($job['application_deadline'] !== null && $job['application_deadline'] < date('Y-m-d')) {
        reply_error('The application deadline for that job has passed.', 422);
    }

    if ((int) $job['posted_by'] === (int) $user['id']) {
        reply_error('You cannot apply to a job you posted.', 422);
    }

    $existing = db_one(
        'SELECT `id` FROM `job_applications` WHERE `job_id` = ? AND `applicant_id` = ? LIMIT 1',
        'ii',
        array($id, $user['id'])
    );

    if ($existing !== null) {
        reply_error('You have already applied to this job.', 409);
    }

    $cv_file_id = null;

    if (isset($_FILES['cv']) && $_FILES['cv']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = save_uploaded_file($_FILES['cv'], 'applicant_cv', $user['id']);
        $cv_file_id = $file['id'];
    }

    $supporting_file_id = null;

    if (isset($_FILES['supportingDocument']) && $_FILES['supportingDocument']['error'] !== UPLOAD_ERR_NO_FILE) {
        $support_file = save_uploaded_file($_FILES['supportingDocument'], 'supporting_document', $user['id']);
        $supporting_file_id = $support_file['id'];
    }

    $application_id = db_insert(
        'INSERT INTO `job_applications` (`job_id`, `applicant_id`, `status`, `cover_note`, `cv_file_id`)
         VALUES (?, ?, \'pending\', ?, ?)',
        'iisi',
        array($id, $user['id'], input_value($input, 'coverNote'), $cv_file_id)
    );

    if ($supporting_file_id !== null) {
        db_query(
            'INSERT INTO `application_documents` (`application_id`, `file_upload_id`, `document_kind`)
             VALUES (?, ?, \'other\')',
            'ii',
            array($application_id, $supporting_file_id)
        );
    }

    db_query(
        'INSERT INTO `application_status_history` (`application_id`, `from_status`, `to_status`, `changed_by`, `note`)
         VALUES (?, NULL, \'pending\', ?, ?)',
        'iis',
        array($application_id, $user['id'], 'Application submitted.')
    );

    reply_ok(array('application_id' => $application_id), 'Application submitted.', 201);
}

/*
 * Lists the applicants for a job. Only the person who posted the job or
 * an administrator may see this list.
 */
function endpoint_job_applications($id)
{
    $user = require_login();

    $job = db_one('SELECT * FROM `jobs` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($job === null) {
        reply_error('That job was not found.', 404);
    }

    $is_owner = (int) $job['posted_by'] === (int) $user['id'];
    $is_admin = $user['role_code'] === 'administrator' || $user['role_code'] === 'school_leader';

    if (!$is_owner && !$is_admin) {
        reply_error('Only the person who posted the job can see its applicants.', 403);
    }

    $applications = db_all(
        'SELECT a.*, u.`full_name` AS `applicant_name`, u.`email` AS `applicant_email`,
                p.`current_role`, p.`current_company`, p.`graduation_year`, d.`name` AS `department_name`,
                f.`original_name` AS `cv_name`, f.`mime_type` AS `cv_mime`
           FROM `job_applications` a
           JOIN `users` u ON u.`id` = a.`applicant_id`
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = u.`id`
           LEFT JOIN `departments` d ON d.`id` = p.`department_id`
           LEFT JOIN `file_uploads` f ON f.`id` = a.`cv_file_id`
          WHERE a.`job_id` = ?
          ORDER BY a.`applied_at` DESC',
        'i',
        array($id)
    );

    foreach ($applications as $idx => $app) {
        $extra_docs = db_all(
            'SELECT f.`id`, f.`original_name`, f.`mime_type`, ad.`document_kind`
               FROM `application_documents` ad
               JOIN `file_uploads` f ON f.`id` = ad.`file_upload_id`
              WHERE ad.`application_id` = ?',
            'i',
            array($app['id'])
        );

        $applications[$idx]['supporting_documents'] = $extra_docs;
    }

    reply_ok(array('job' => $job, 'applications' => $applications));
}

/*
 * Moves an application to the next status and records the change.
 */
function endpoint_update_application_status($application_id)
{
    $user = require_login();
    $input = read_input();
    $errors = array();

    check_required($input, 'status', 'Status', $errors);
    check_choice($input, 'status', 'Status', array('pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'), $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $application = db_one(
        'SELECT a.*, j.`posted_by` FROM `job_applications` a
           JOIN `jobs` j ON j.`id` = a.`job_id`
          WHERE a.`id` = ?',
        'i',
        array($application_id)
    );

    if ($application === null) {
        reply_error('That application was not found.', 404);
    }

    $is_owner = (int) $application['posted_by'] === (int) $user['id'];
    $is_admin = $user['role_code'] === 'administrator' || $user['role_code'] === 'school_leader';

    if (!$is_owner && !$is_admin) {
        reply_error('You cannot change this application.', 403);
    }

    $new_status = input_value($input, 'status');

    db_query(
        'UPDATE `job_applications` SET `status` = ? WHERE `id` = ?',
        'si',
        array($new_status, $application_id)
    );

    db_query(
        'INSERT INTO `application_status_history` (`application_id`, `from_status`, `to_status`, `changed_by`, `note`)
         VALUES (?, ?, ?, ?, ?)',
        'issis',
        array($application_id, $application['status'], $new_status, $user['id'], input_value($input, 'note'))
    );

    db_query(
        'INSERT INTO `notifications` (`user_id`, `type`, `title`, `body`, `link_path`)
         VALUES (?, \'application_status\', ?, ?, ?)',
        'isss',
        array(
            $application['applicant_id'],
            'Application updated',
            'Your application is now marked as ' . $new_status . '.',
            'api/jobs.php?id=' . $application['job_id'],
        )
    );

    reply_ok(null, 'Application status updated.');
}

/*
 * Closes or reopens a job posting.
 */
function endpoint_update_job($id)
{
    $user = require_permission('jobs.manage_own');
    $input = read_input();

    $job = db_one('SELECT * FROM `jobs` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($job === null) {
        reply_error('That job was not found.', 404);
    }

    $is_owner = (int) $job['posted_by'] === (int) $user['id'];
    $is_admin = $user['role_code'] === 'administrator' || $user['role_code'] === 'school_leader';

    if (!$is_owner && !$is_admin) {
        reply_error('You cannot change this job.', 403);
    }

    $status = input_value($input, 'status');

    if (!in_array($status, array('draft', 'open', 'closed', 'archived'), true)) {
        reply_error('That status is not valid.', 422);
    }

    db_query('UPDATE `jobs` SET `status` = ? WHERE `id` = ?', 'si', array($status, $id));

    reply_ok(null, 'Job updated.');
}

/*
 * Removes a job posting and everything attached to it.
 */
function endpoint_delete_job($id)
{
    $user = require_permission('jobs.manage_own');

    $job = db_one('SELECT * FROM `jobs` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($job === null) {
        reply_error('That job was not found.', 404);
    }

    $is_owner = (int) $job['posted_by'] === (int) $user['id'];
    $is_admin = $user['role_code'] === 'administrator' || $user['role_code'] === 'school_leader';

    if (!$is_owner && !$is_admin) {
        reply_error('You cannot delete this job.', 403);
    }

    db_query('DELETE FROM `jobs` WHERE `id` = ?', 'i', array($id));

    reply_ok(null, 'Job deleted.');
}
