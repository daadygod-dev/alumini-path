<?php
/*
 * Alumini-Path :: mentorship management.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/validation.php';
require_once __DIR__ . '/../config/auth.php';

/*
 * Lists the members who offer mentorship.
 */
function endpoint_mentors()
{
    require_login();

    $search = query_value('search');
    $expertise = query_value('expertise');

    $where = array('mp.`is_accepting` = 1', 'u.`status` = \'active\'');
    $types = '';
    $params = array();

    if ($search !== '') {
        $where[] = '(u.`full_name` LIKE ? OR mp.`headline` LIKE ? OR mp.`areas_of_expertise` LIKE ?)';
        $like = '%' . $search . '%';
        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if ($expertise !== '') {
        $where[] = 'mp.`areas_of_expertise` LIKE ?';
        $types .= 's';
        $params[] = '%' . $expertise . '%';
    }

    $mentors = db_all(
        'SELECT mp.*, u.`full_name`, u.`email`, p.`current_role`, p.`current_company`, p.`location`,
                (SELECT COUNT(*) FROM `mentorship_requests` r WHERE r.`mentor_id` = mp.`user_id` AND r.`status` = \'accepted\') AS `active_mentees`
           FROM `mentor_profiles` mp
           JOIN `users` u ON u.`id` = mp.`user_id`
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = mp.`user_id`
          WHERE ' . implode(' AND ', $where) . '
          ORDER BY mp.`years_of_experience` DESC',
        $types,
        $params
    );

    reply_ok(array('mentors' => $mentors));
}

/*
 * Registers the signed in user as a mentor.
 */
function endpoint_become_mentor()
{
    $user = require_login();
    $input = read_input();
    $errors = array();

    check_required($input, 'professionalBackground', 'Professional background', $errors);
    check_required($input, 'areasOfExpertise', 'Areas of expertise', $errors);
    check_number($input, 'yearsOfExperience', 'Years of experience', 0, 60, $errors);
    check_number($input, 'maxActiveMentees', 'Maximum mentees', 1, 50, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $existing = db_one('SELECT `user_id` FROM `mentor_profiles` WHERE `user_id` = ?', 'i', array($user['id']));

    if ($existing !== null) {
        db_query(
            'UPDATE `mentor_profiles`
                SET `headline` = ?, `professional_background` = ?, `areas_of_expertise` = ?,
                    `years_of_experience` = ?, `mentorship_interests` = ?, `max_active_mentees` = ?, `is_accepting` = 1
              WHERE `user_id` = ?',
            'sssisii',
            array(
                input_value($input, 'headline'),
                input_value($input, 'professionalBackground'),
                input_value($input, 'areasOfExpertise'),
                input_int($input, 'yearsOfExperience'),
                input_value($input, 'mentorshipInterests'),
                input_int($input, 'maxActiveMentees'),
                $user['id'],
            )
        );

        db_query('UPDATE `alumni_profiles` SET `mentorship_available` = 1 WHERE `user_id` = ?', 'i', array($user['id']));

        reply_ok(null, 'Mentor profile updated.');
    }

    db_query(
        'INSERT INTO `mentor_profiles`
            (`user_id`, `headline`, `professional_background`, `areas_of_expertise`, `years_of_experience`, `mentorship_interests`, `max_active_mentees`, `is_accepting`)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        'isssisi',
        array(
            $user['id'],
            input_value($input, 'headline'),
            input_value($input, 'professionalBackground'),
            input_value($input, 'areasOfExpertise'),
            input_int($input, 'yearsOfExperience'),
            input_value($input, 'mentorshipInterests'),
            input_int($input, 'maxActiveMentees'),
        )
    );

    db_query('UPDATE `alumni_profiles` SET `mentorship_available` = 1 WHERE `user_id` = ?', 'i', array($user['id']));

    reply_ok(null, 'You are now listed as a mentor.', 201);
}

/*
 * Sends a mentorship request to a mentor.
 */
function endpoint_request_mentorship($mentor_id)
{
    $user = require_permission('mentorship.request');
    $input = read_input();
    $errors = array();

    check_required($input, 'careerInterests', 'Career interests', $errors);
    check_text_length($input, 'expectations', 'Expectations', 2000, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    if ((int) $mentor_id === (int) $user['id']) {
        reply_error('You cannot send a mentorship request to yourself.', 422);
    }

    $mentor = db_one(
        'SELECT * FROM `mentor_profiles` WHERE `user_id` = ? AND `is_accepting` = 1 LIMIT 1',
        'i',
        array($mentor_id)
    );

    if ($mentor === null) {
        reply_error('That mentor is not accepting requests at the moment.', 404);
    }

    $existing = db_one(
        'SELECT `id`, `status` FROM `mentorship_requests` WHERE `mentor_id` = ? AND `mentee_id` = ? LIMIT 1',
        'ii',
        array($mentor_id, $user['id'])
    );

    if ($existing !== null && in_array($existing['status'], array('pending', 'accepted'), true)) {
        reply_error('You already have a request with that mentor.', 409);
    }

    if ($existing !== null) {
        db_query(
            'UPDATE `mentorship_requests`
                SET `career_interests` = ?, `expectations` = ?, `message` = ?, `status` = \'pending\', `responded_at` = NULL
              WHERE `id` = ?',
            'sssi',
            array(input_value($input, 'careerInterests'), input_value($input, 'expectations'), input_value($input, 'message'), $existing['id'])
        );

        reply_ok(array('request_id' => (int) $existing['id']), 'Mentorship request sent.');
    }

    $request_id = db_insert(
        'INSERT INTO `mentorship_requests` (`mentor_id`, `mentee_id`, `career_interests`, `expectations`, `message`, `status`)
         VALUES (?, ?, ?, ?, ?, \'pending\')',
        'iisss',
        array($mentor_id, $user['id'], input_value($input, 'careerInterests'), input_value($input, 'expectations'), input_value($input, 'message'))
    );

    db_query(
        'INSERT INTO `notifications` (`user_id`, `type`, `title`, `body`, `link_path`)
         VALUES (?, \'mentorship_request\', ?, ?, ?)',
        'isss',
        array($mentor_id, 'New mentorship request', 'Someone asked you to be their mentor.', 'api/mentorship.php?action=requests')
    );

    reply_ok(array('request_id' => $request_id), 'Mentorship request sent.', 201);
}

/*
 * Lists the requests the signed in user sent or received, and lets a
 * mentor accept or reject them.
 */
function endpoint_mentorship_requests($action = '')
{
    $user = require_login();

    if ($action === 'respond') {
        $input = read_input();
        $errors = array();

        check_required($input, 'requestId', 'Request', $errors);
        check_choice($input, 'decision', 'Decision', array('accepted', 'rejected', 'cancelled'), $errors);

        stop_if_errors($errors, 'Please fix the highlighted fields.');

        $request = db_one(
            'SELECT * FROM `mentorship_requests` WHERE `id` = ? AND `mentor_id` = ? LIMIT 1',
            'ii',
            array(input_int($input, 'requestId'), $user['id'])
        );

        if ($request === null) {
            reply_error('That request was not found.', 404);
        }

        $decision = input_value($input, 'decision');

        if ($decision === 'accepted') {
            $active = (int) db_value(
                'SELECT COUNT(*) FROM `mentorship_requests` WHERE `mentor_id` = ? AND `status` = \'accepted\'',
                'i',
                array($user['id'])
            );

            $capacity = (int) db_value('SELECT `max_active_mentees` FROM `mentor_profiles` WHERE `user_id` = ?', 'i', array($user['id']));

            if ($active >= $capacity) {
                reply_error('You have reached the number of mentees you accept.', 422);
            }
        }

        db_query(
            'UPDATE `mentorship_requests` SET `status` = ?, `responded_at` = NOW() WHERE `id` = ?',
            'si',
            array($decision, $request['id'])
        );

        reply_ok(null, 'Mentorship request updated.');
    }

    $received = db_all(
        'SELECT r.*, u.`full_name` AS `other_name`, u.`email` AS `other_email`, p.`current_role`
           FROM `mentorship_requests` r
           JOIN `users` u ON u.`id` = r.`mentee_id`
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = r.`mentee_id`
          WHERE r.`mentor_id` = ?
          ORDER BY r.`created_at` DESC',
        'i',
        array($user['id'])
    );

    $sent = db_all(
        'SELECT r.*, u.`full_name` AS `other_name`, u.`email` AS `other_email`, p.`current_role`
           FROM `mentorship_requests` r
           JOIN `users` u ON u.`id` = r.`mentor_id`
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = r.`mentor_id`
          WHERE r.`mentee_id` = ?
          ORDER BY r.`created_at` DESC',
        'i',
        array($user['id'])
    );

    $sessions = db_all(
        'SELECT s.*, r.`mentor_id`, r.`mentee_id`
           FROM `mentorship_sessions` s
           JOIN `mentorship_requests` r ON r.`id` = s.`mentorship_request_id`
          WHERE r.`mentor_id` = ? OR r.`mentee_id` = ?
          ORDER BY s.`scheduled_at` DESC',
        'ii',
        array($user['id'], $user['id'])
    );

    reply_ok(array('received' => $received, 'sent' => $sent, 'sessions' => $sessions));
}

/*
 * Schedules a mentorship session.
 */
function endpoint_create_mentorship_session()
{
    $user = require_login();
    $input = read_input();
    $errors = array();

    check_required($input, 'requestId', 'Request', $errors);
    check_required($input, 'scheduledAt', 'Date and time', $errors);
    check_choice($input, 'meetingMode', 'Meeting mode', array('virtual', 'in_person', 'phone', 'email'), $errors);
    check_number($input, 'durationMinutes', 'Duration', 15, 480, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $request = db_one(
        'SELECT * FROM `mentorship_requests` WHERE `id` = ? LIMIT 1',
        'i',
        array(input_int($input, 'requestId'))
    );

    if ($request === null) {
        reply_error('That mentorship request was not found.', 404);
    }

    if ((int) $request['mentor_id'] !== (int) $user['id'] && (int) $request['mentee_id'] !== (int) $user['id']) {
        reply_error('You are not part of that mentorship.', 403);
    }

    $session_id = db_insert(
        'INSERT INTO `mentorship_sessions`
            (`mentorship_request_id`, `scheduled_at`, `duration_minutes`, `meeting_mode`, `location_or_link`, `notes`, `status`)
         VALUES (?, ?, ?, ?, ?, ?, \'scheduled\')',
        'isisss',
        array(
            $request['id'],
            input_value($input, 'scheduledAt'),
            input_int($input, 'durationMinutes'),
            input_value($input, 'meetingMode'),
            input_value($input, 'locationOrLink'),
            input_value($input, 'notes'),
        )
    );

    reply_ok(array('session_id' => $session_id), 'Mentorship session scheduled.', 201);
}

/*
 * Marks a mentorship session as completed and records the notes.
 */
function endpoint_complete_mentorship_session($id)
{
    $user = require_login();
    $input = read_input();

    $session = db_one(
        'SELECT s.*, r.`mentor_id`, r.`mentee_id` FROM `mentorship_sessions` s
           JOIN `mentorship_requests` r ON r.`id` = s.`mentorship_request_id`
          WHERE s.`id` = ?',
        'i',
        array($id)
    );

    if ($session === null) {
        reply_error('That session was not found.', 404);
    }

    if ((int) $session['mentor_id'] !== (int) $user['id'] && (int) $session['mentee_id'] !== (int) $user['id']) {
        reply_error('You are not part of that mentorship.', 403);
    }

    db_query(
        'UPDATE `mentorship_sessions` SET `status` = \'completed\', `completed_at` = NOW(), `notes` = ? WHERE `id` = ?',
        'si',
        array(input_value($input, 'notes'), $id)
    );

    reply_ok(null, 'Session marked as completed.');
}
