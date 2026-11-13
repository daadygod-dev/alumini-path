<?php
/*
 * Alumini-Path :: alumni events, registration and attendance.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/validation.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/uploads.php';

/*
 * Lists the events, newest first, with the signed in user's registration.
 */
function endpoint_events()
{
    $user = require_login();

    $category = query_value('category');
    $upcoming = query_value('upcoming');

    $where = array('1 = 1');
    $types = '';
    $params = array();

    if ($category !== '' && $category !== 'all') {
        $where[] = 'e.`category` = ?';
        $types .= 's';
        $params[] = $category;
    }

    if ($upcoming === '1') {
        $where[] = 'e.`event_date` >= CURDATE()';
    }

    $all_params = array($user['id']);
    foreach ($params as $value) {
        $all_params[] = $value;
    }

    $events = db_all(
        'SELECT e.*,
                (SELECT COUNT(*) FROM `event_registrations` r WHERE r.`event_id` = e.`id` AND r.`status` IN (\'registered\', \'attended\')) AS `registered_count`,
                (SELECT r.`status` FROM `event_registrations` r WHERE r.`event_id` = e.`id` AND r.`user_id` = ?) AS `my_status`
           FROM `events` e
          WHERE ' . implode(' AND ', $where) . '
          ORDER BY e.`event_date` ASC, e.`starts_at` ASC',
        'i' . $types,
        $all_params
    );

    foreach ($events as $index => $item) {
        $poster_id = isset($item['poster_file_id']) ? (int) $item['poster_file_id'] : 0;
        $events[$index]['poster_url'] = $poster_id > 0 ? 'api/files.php?id=' . $poster_id : '';
    }

    reply_ok(array('events' => $events));
}

/*
 * Shows one event with its participant list.
 */
function endpoint_event($id)
{
    $user = require_login();

    $event = db_one(
        'SELECT e.*, u.`full_name` AS `created_by_name` FROM `events` e
           JOIN `users` u ON u.`id` = e.`created_by`
          WHERE e.`id` = ?',
        'i',
        array($id)
    );

    if ($event === null) {
        reply_error('That event was not found.', 404);
    }

    $participants = db_all(
        'SELECT r.*, u.`full_name`, u.`email`, p.`current_role`, p.`current_company`
           FROM `event_registrations` r
           JOIN `users` u ON u.`id` = r.`user_id`
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = r.`user_id`
          WHERE r.`event_id` = ?
          ORDER BY r.`registered_at` ASC',
        'i',
        array($id)
    );

    $my_registration = db_one(
        'SELECT * FROM `event_registrations` WHERE `event_id` = ? AND `user_id` = ? LIMIT 1',
        'ii',
        array($id, $user['id'])
    );

    reply_ok(array(
        'event'           => $event,
        'participants'    => $participants,
        'my_registration' => $my_registration,
    ));
}

/*
 * Creates an event. Only administrators and staff may do this.
 */
function endpoint_create_event()
{
    $user = require_permission('events.manage');
    $input = read_input();
    $errors = array();

    check_required($input, 'title', 'Title', $errors);
    check_required($input, 'description', 'Description', $errors);
    check_required($input, 'venue', 'Venue', $errors);
    check_date($input, 'eventDate', 'Event date', $errors);
    check_time($input, 'startsAt', 'Start time', $errors);
    check_time($input, 'endsAt', 'End time', $errors);
    check_date($input, 'registrationDeadline', 'Registration deadline', $errors);
    check_number($input, 'availableSeats', 'Available seats', 1, 100000, $errors);
    check_choice($input, 'category', 'Category', array('conference', 'workshop', 'networking_session', 'career_fair', 'reunion', 'graduation_anniversary', 'seminar', 'other'), $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $starts_at = input_value($input, 'startsAt');
    $ends_at = input_value($input, 'endsAt');

    if (strlen($starts_at) === 5) {
        $starts_at = $starts_at . ':00';
    }
    if (strlen($ends_at) === 5) {
        $ends_at = $ends_at . ':00';
    }

    if ($ends_at <= $starts_at) {
        reply_error('The end time must be later than the start time.', 422);
    }

    $poster_file_id = null;
    if (isset($_FILES['poster']) && $_FILES['poster']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = save_uploaded_file($_FILES['poster'], 'event_poster', $user['id']);
        $poster_file_id = $file['id'];
    }

    $reg_deadline = input_value($input, 'registrationDeadline');
    if ($reg_deadline === '') {
        $reg_deadline = null;
    }

    $event_id = db_insert(
        'INSERT INTO `events`
            (`created_by`, `title`, `description`, `category`, `venue`, `event_date`, `starts_at`, `ends_at`,
             `registration_deadline`, `available_seats`, `poster_file_id`, `status`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'published\')',
        'issssssssii',
        array(
            $user['id'],
            input_value($input, 'title'),
            input_value($input, 'description'),
            input_value($input, 'category'),
            input_value($input, 'venue'),
            input_value($input, 'eventDate'),
            $starts_at,
            $ends_at,
            $reg_deadline,
            input_int($input, 'availableSeats'),
            $poster_file_id,
        )
    );

    reply_ok(array('event_id' => $event_id), 'Event published.', 201);
}

/*
 * Registers the signed in user for an event.
 */
function endpoint_register_for_event($id)
{
    $user = require_permission('events.register');

    $event = db_one('SELECT * FROM `events` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($event === null) {
        reply_error('That event was not found.', 404);
    }

    if ($event['status'] !== 'published') {
        reply_error('That event is not open for registration.', 422);
    }

    if ($event['registration_deadline'] !== null && $event['registration_deadline'] < date('Y-m-d')) {
        reply_error('The registration deadline for that event has passed.', 422);
    }

    $existing = db_one(
        'SELECT `id`, `status` FROM `event_registrations` WHERE `event_id` = ? AND `user_id` = ? LIMIT 1',
        'ii',
        array($id, $user['id'])
    );

    if ($existing !== null && $existing['status'] === 'registered') {
        reply_error('You are already registered for that event.', 409);
    }

    // Take the seat only if seats are still available.
    $updated = db_change(
        'UPDATE `events` SET `seats_taken` = `seats_taken` + 1
          WHERE `id` = ? AND `seats_taken` < `available_seats`',
        'i',
        array($id)
    );

    if ($updated === 0) {
        reply_error('All the seats for that event are taken.', 409);
    }

    if ($existing !== null) {
        db_query(
            'UPDATE `event_registrations` SET `status` = \'registered\', `registered_at` = NOW(), `cancelled_at` = NULL WHERE `id` = ?',
            'i',
            array($existing['id'])
        );
    } else {
        db_query(
            'INSERT INTO `event_registrations` (`event_id`, `user_id`, `status`) VALUES (?, ?, \'registered\')',
            'ii',
            array($id, $user['id'])
        );
    }

    reply_ok(null, 'You are registered for this event.', 201);
}

/*
 * Cancels a registration and gives the seat back.
 */
function endpoint_cancel_event_registration($id)
{
    $user = require_permission('events.register');

    $registration = db_one(
        'SELECT * FROM `event_registrations` WHERE `event_id` = ? AND `user_id` = ? LIMIT 1',
        'ii',
        array($id, $user['id'])
    );

    if ($registration === null) {
        reply_error('You are not registered for that event.', 404);
    }

    if ($registration['status'] === 'cancelled') {
        reply_error('That registration is already cancelled.', 422);
    }

    db_query(
        'UPDATE `event_registrations` SET `status` = \'cancelled\', `cancelled_at` = NOW() WHERE `id` = ?',
        'i',
        array($registration['id'])
    );

    db_query('UPDATE `events` SET `seats_taken` = `seats_taken` - 1 WHERE `id` = ? AND `seats_taken` > 0', 'i', array($id));

    reply_ok(null, 'Registration cancelled.');
}

/*
 * Marks an attendee as present. Only staff may do this.
 */
function endpoint_mark_attendance($event_id, $user_id)
{
    require_permission('events.manage');

    $registration = db_one(
        'SELECT * FROM `event_registrations` WHERE `event_id` = ? AND `user_id` = ? LIMIT 1',
        'ii',
        array($event_id, $user_id)
    );

    if ($registration === null) {
        reply_error('That person is not registered for this event.', 404);
    }

    $status = query_value('status', 'attended');

    if (!in_array($status, array('attended', 'absent'), true)) {
        reply_error('That attendance status is not valid.', 422);
    }

    db_query(
        'UPDATE `event_registrations` SET `status` = ?, `checked_in_at` = NOW() WHERE `id` = ?',
        'si',
        array($status, $registration['id'])
    );

    audit_log_action(require_login()['id'], 'event.attendance_' . $status, 'events', $event_id, 'user:' . $user_id);

    reply_ok(null, 'Attendance updated.');
}

/*
 * Updates event information and optionally replaces the poster.
 */
function endpoint_update_event($id)
{
    $user = require_permission('events.manage');
    $event = db_one('SELECT * FROM `events` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($event === null) {
        reply_error('That event was not found.', 404);
    }

    $input = read_input();
    $errors = array();

    check_required($input, 'title', 'Title', $errors);
    check_required($input, 'description', 'Description', $errors);
    check_required($input, 'venue', 'Venue', $errors);
    check_date($input, 'eventDate', 'Event date', $errors);
    check_time($input, 'startsAt', 'Start time', $errors);
    check_time($input, 'endsAt', 'End time', $errors);
    check_date($input, 'registrationDeadline', 'Registration deadline', $errors);
    check_number($input, 'availableSeats', 'Available seats', max(1, (int) $event['seats_taken']), 100000, $errors);
    check_choice($input, 'category', 'Category', array('conference', 'workshop', 'networking_session', 'career_fair', 'reunion', 'graduation_anniversary', 'seminar', 'other'), $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $starts_at = input_value($input, 'startsAt');
    if ($starts_at === '' && isset($event['starts_at'])) {
        $starts_at = $event['starts_at'];
    }
    $ends_at = input_value($input, 'endsAt');
    if ($ends_at === '' && isset($event['ends_at'])) {
        $ends_at = $event['ends_at'];
    }
    if (strlen($starts_at) === 5) {
        $starts_at = $starts_at . ':00';
    }
    if (strlen($ends_at) === 5) {
        $ends_at = $ends_at . ':00';
    }
    if ($starts_at !== '' && $ends_at !== '' && $ends_at <= $starts_at) {
        reply_error('The end time must be later than the start time.', 422);
    }

    $poster_file_id = $event['poster_file_id'];
    if (isset($_FILES['poster']) && $_FILES['poster']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = save_uploaded_file($_FILES['poster'], 'event_poster', $user['id']);
        $poster_file_id = $file['id'];
    }

    $reg_deadline = input_value($input, 'registrationDeadline');
    if ($reg_deadline === '') {
        $reg_deadline = null;
    }

    $status = input_value($input, 'status', $event['status']);
    if (!in_array($status, array('draft', 'published', 'cancelled', 'completed'), true)) {
        $status = $event['status'];
    }

    db_query(
        'UPDATE `events`
            SET `title` = ?, `description` = ?, `category` = ?, `venue` = ?, `event_date` = ?,
                `starts_at` = ?, `ends_at` = ?, `registration_deadline` = ?, `available_seats` = ?,
                `poster_file_id` = ?, `status` = ?
          WHERE `id` = ?',
        'ssssssssiisi',
        array(
            input_value($input, 'title'),
            input_value($input, 'description'),
            input_value($input, 'category'),
            input_value($input, 'venue'),
            input_value($input, 'eventDate'),
            $starts_at,
            $ends_at,
            $reg_deadline,
            input_int($input, 'availableSeats'),
            $poster_file_id,
            $status,
            $id,
        )
    );

    audit_log_action($user['id'], 'event.updated', 'events', $id, input_value($input, 'title'));

    reply_ok(null, 'Event updated.');
}

/*
 * Deletes an event created by administration.
 */
function endpoint_delete_event($id)
{
    $user = require_permission('events.manage');
    $event = db_one('SELECT `id`, `title` FROM `events` WHERE `id` = ? LIMIT 1', 'i', array($id));

    if ($event === null) {
        reply_error('That event was not found.', 404);
    }

    db_query('DELETE FROM `events` WHERE `id` = ?', 'i', array($id));
    audit_log_action($user['id'], 'event.deleted', 'events', $id, $event['title']);

    reply_ok(null, 'Event removed.');
}
