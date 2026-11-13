<?php
/*
 * Alumini-Path :: alumni directory, profiles and connections.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/validation.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/uploads.php';

/*
 * Lists directory members with search, filters, sorting and pagination.
 */
function endpoint_directory()
{
    require_login();

    $search = query_value('search');
    $year = query_int('graduationYear', 0);
    $department = query_int('department', 0);
    $programme = query_int('programme', 0);
    $sector = query_int('sector', 0);
    $role = query_value('role');
    $skill = query_value('skill');
    $page = query_int('page', 1);
    $page_size = query_int('pageSize', 10);
    $sort = query_value('sort', 'full_name');
    $direction = strtolower(query_value('direction', 'asc'));

    if ($page < 1) {
        $page = 1;
    }
    if ($page_size < 1 || $page_size > 100) {
        $page_size = 10;
    }
    if ($direction !== 'asc' && $direction !== 'desc') {
        $direction = 'asc';
    }

    $allowed_sorts = array('full_name', 'graduation_year', 'department_name', 'current_role', 'current_company');
    if (!in_array($sort, $allowed_sorts, true)) {
        $sort = 'full_name';
    }

    $where = array('1 = 1');
    $types = '';
    $params = array();

    if ($search !== '') {
        $where[] = '(v.`full_name` LIKE ? OR v.`email` LIKE ? OR v.`current_company` LIKE ? OR v.`current_role` LIKE ? OR EXISTS (SELECT 1 FROM `user_skills` us JOIN `skills` s ON s.`id` = us.`skill_id` WHERE us.`user_id` = v.`user_id` AND s.`name` LIKE ?))';
        $like = '%' . $search . '%';
        $types .= 'sssss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if ($year > 0) {
        $where[] = 'v.`graduation_year` = ?';
        $types .= 'i';
        $params[] = $year;
    }

    if ($department > 0) {
        $where[] = 'v.`department_id` = ?';
        $types .= 'i';
        $params[] = $department;
    }

    if ($programme > 0) {
        $where[] = 'v.`programme_id` = ?';
        $types .= 'i';
        $params[] = $programme;
    }

    if ($sector > 0) {
        $where[] = 'v.`sector_id` = ?';
        $types .= 'i';
        $params[] = $sector;
    }

    if ($role !== '') {
        $where[] = 'v.`role_code` = ?';
        $types .= 's';
        $params[] = $role;
    }

    if ($skill !== '') {
        $where[] = 'EXISTS (SELECT 1 FROM `user_skills` us JOIN `skills` s ON s.`id` = us.`skill_id`
                             WHERE us.`user_id` = v.`user_id` AND s.`name` = ?)';
        $types .= 's';
        $params[] = $skill;
    }

    $where_sql = implode(' AND ', $where);
    $order_sql = 'v.`' . $sort . '` ' . ($direction === 'desc' ? 'DESC' : 'ASC');

    $total = (int) db_value(
        'SELECT COUNT(*) FROM `v_alumni_directory` v WHERE ' . $where_sql,
        $types,
        $params
    );

    $offset = ($page - 1) * $page_size;

    $types .= 'ii';
    $params[] = $page_size;
    $params[] = $offset;

    $rows = db_all(
        'SELECT v.* FROM `v_alumni_directory` v
          WHERE ' . $where_sql . '
          ORDER BY ' . $order_sql . '
          LIMIT ? OFFSET ?',
        $types,
        $params
    );

    $rows = attach_skills_to_rows($rows);

    reply_ok(array(
        'rows'     => $rows,
        'total'    => $total,
        'page'     => $page,
        'pageSize' => $page_size,
    ));
}

/*
 * Adds skills, education, employment, posts and avatar URL to every row
 * of the directory list so profiles render with real database records.
 */
function attach_skills_to_rows($rows)
{
    foreach ($rows as $index => $row) {
        $member_id = (int) $row['user_id'];

        $skills = db_all(
            'SELECT s.`name` FROM `user_skills` us JOIN `skills` s ON s.`id` = us.`skill_id`
              WHERE us.`user_id` = ? ORDER BY s.`name`',
            'i',
            array($member_id)
        );

        $names = array();

        foreach ($skills as $skill) {
            $names[] = $skill['name'];
        }

        $education = db_all(
            'SELECT `id`, `qualification`, `institution`, `start_year`, `end_year`, `grade`, `description`
               FROM `education_records`
              WHERE `user_id` = ?
              ORDER BY `sort_order`, `id`',
            'i',
            array($member_id)
        );

        $employment = db_all(
            'SELECT e.`id`, e.`job_title`, e.`company`, e.`location`, e.`start_date`, e.`end_date`, e.`is_current`,
                    s.`name` AS `sector_name`
               FROM `employment_records` e
               LEFT JOIN `sectors` s ON s.`id` = e.`sector_id`
              WHERE e.`user_id` = ?
              ORDER BY e.`start_date` DESC, e.`id` DESC',
            'i',
            array($member_id)
        );

        $posts = db_all(
            'SELECT p.`id`, p.`body`, p.`created_at`,
                    (SELECT COUNT(*) FROM `post_comments` c WHERE c.`post_id` = p.`id`) AS `comment_count`,
                    (SELECT COUNT(*) FROM `post_likes` l WHERE l.`post_id` = p.`id`) AS `like_count`
               FROM `posts` p
              WHERE p.`author_id` = ? AND p.`status` = \'published\'
              ORDER BY p.`created_at` DESC
              LIMIT 10',
            'i',
            array($member_id)
        );

        $avatar_id = (int) db_value(
            'SELECT `avatar_file_id` FROM `alumni_profiles` WHERE `user_id` = ? LIMIT 1',
            'i',
            array($member_id)
        );

        $rows[$index]['skills'] = $names;
        $rows[$index]['education'] = $education;
        $rows[$index]['employment'] = $employment;
        $rows[$index]['posts'] = $posts;
        $rows[$index]['avatar_url'] = $avatar_id > 0 ? 'api/files.php?id=' . $avatar_id : '';
    }

    return $rows;
}

/*
 * Returns the full profile of one member.
 */
function endpoint_member_profile($id)
{
    $user = require_login();

    $member = db_one(
        'SELECT * FROM `v_alumni_directory` WHERE `user_id` = ? LIMIT 1',
        'i',
        array($id)
    );

    if ($member === null) {
        reply_error('That member was not found.', 404);
    }

    $avatar_id = (int) db_value(
        'SELECT `avatar_file_id` FROM `alumni_profiles` WHERE `user_id` = ? LIMIT 1',
        'i',
        array($id)
    );
    $member['avatar_url'] = $avatar_id > 0 ? 'api/files.php?id=' . $avatar_id : '';

    $education = db_all(
        'SELECT * FROM `education_records` WHERE `user_id` = ? ORDER BY `sort_order`, `id`',
        'i',
        array($id)
    );

    $employment = db_all(
        'SELECT e.*, s.`name` AS `sector_name`
           FROM `employment_records` e
           LEFT JOIN `sectors` s ON s.`id` = e.`sector_id`
          WHERE e.`user_id` = ?
          ORDER BY e.`start_date` DESC',
        'i',
        array($id)
    );

    $skills = db_all(
        'SELECT s.`id`, s.`name` FROM `user_skills` us JOIN `skills` s ON s.`id` = us.`skill_id`
          WHERE us.`user_id` = ? ORDER BY s.`name`',
        'i',
        array($id)
    );

    $posts = db_all(
        'SELECT p.`id`, p.`body`, p.`created_at`,
                (SELECT COUNT(*) FROM `post_comments` c WHERE c.`post_id` = p.`id`) AS `comment_count`,
                (SELECT COUNT(*) FROM `post_likes` l WHERE l.`post_id` = p.`id`) AS `like_count`
           FROM `posts` p
          WHERE p.`author_id` = ? AND p.`status` = \'published\'
          ORDER BY p.`created_at` DESC
          LIMIT 20',
        'i',
        array($id)
    );

    $connection = db_one(
        'SELECT * FROM `connections`
          WHERE (`requester_id` = ? AND `addressee_id` = ?)
             OR (`requester_id` = ? AND `addressee_id` = ?)
          LIMIT 1',
        'iiii',
        array($user['id'], $id, $id, $user['id'])
    );

    reply_ok(array(
        'member'     => $member,
        'education'  => $education,
        'employment' => $employment,
        'skills'     => $skills,
        'posts'      => $posts,
        'connection' => $connection,
    ));
}

/*
 * Updates the profile of the signed in user.
 */
function endpoint_update_profile()
{
    $user = require_permission('profile.edit');
    $input = read_input();
    $errors = array();

    check_required($input, 'fullName', 'Full name', $errors);
    check_email($input, 'email', 'Email', $errors);
    check_numeric_text($input, 'phone', 'Telephone', $errors);
    check_year($input, 'graduationYear', 'Graduation year', $errors);
    check_required($input, 'currentRole', 'Current role', $errors);
    check_required($input, 'company', 'Organization', $errors);
    check_text_length($input, 'bio', 'Bio', 2000, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $email = strtolower(input_value($input, 'email'));

    $taken = db_value(
        'SELECT `id` FROM `users` WHERE `email` = ? AND `id` <> ? LIMIT 1',
        'si',
        array($email, $user['id'])
    );

    if ($taken !== null) {
        reply_error('That email address is already in use.', 409);
    }

    $department_id = db_value('SELECT `id` FROM `departments` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'department')));
    $programme_id = db_value('SELECT `id` FROM `programmes` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'programme')));
    $sector_id = null;

    if (input_value($input, 'sector') !== '') {
        $sector_id = db_value('SELECT `id` FROM `sectors` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'sector')));
    }

    $uploaded_avatar = null;
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] !== UPLOAD_ERR_NO_FILE) {
        $uploaded_avatar = save_uploaded_file($_FILES['avatar'], 'profile_photo', $user['id']);
    }

    db_query(
        'UPDATE `users` SET `full_name` = ?, `email` = ?, `phone` = ? WHERE `id` = ?',
        'sssi',
        array(input_value($input, 'fullName'), $email, input_value($input, 'phone'), $user['id'])
    );

    db_query(
        'UPDATE `alumni_profiles`
            SET `graduation_year` = ?, `department_id` = ?, `programme_id` = ?, `sector_id` = ?,
                `current_role` = ?, `current_company` = ?, `location` = ?, `bio` = ?
          WHERE `user_id` = ?',
        'iiiissssi',
        array(
            input_int($input, 'graduationYear'),
            $department_id,
            $programme_id,
            $sector_id,
            input_value($input, 'currentRole'),
            input_value($input, 'company'),
            input_value($input, 'location'),
            input_value($input, 'bio'),
            $user['id'],
        )
    );

    if ($uploaded_avatar !== null) {
        db_query(
            'UPDATE `alumni_profiles` SET `avatar_file_id` = ? WHERE `user_id` = ?',
            'ii',
            array($uploaded_avatar['id'], $user['id'])
        );
    }

    if (array_key_exists('regNo', $input)) {
        $reg_no = input_value($input, 'regNo');
        if ($reg_no === '') {
            $reg_no = null;
        }
        db_query(
            'UPDATE `alumni_profiles` SET `reg_no` = ? WHERE `user_id` = ?',
            'si',
            array($reg_no, $user['id'])
        );
    }

    if (array_key_exists('skills', $input)) {
        db_query('DELETE FROM `user_skills` WHERE `user_id` = ?', 'i', array($user['id']));

        foreach (split_list(input_value($input, 'skills')) as $skill_name) {
            $skill_id = find_or_create_skill($skill_name);

            if ($skill_id !== null) {
                db_query(
                    'INSERT IGNORE INTO `user_skills` (`user_id`, `skill_id`) VALUES (?, ?)',
                    'ii',
                    array($user['id'], $skill_id)
                );
            }
        }
    }

    reply_ok(null, 'Profile updated.');
}

/*
 * Creates a directory member on behalf of an authorized staff user or admin
 * without signing the caller out or overwriting their session token.
 */
function endpoint_create_member()
{
    require_permission('directory.manage');
    $input = read_input();
    $errors = array();

    check_required($input, 'fullName', 'Full name', $errors);
    check_email($input, 'email', 'Email', $errors);
    check_numeric_text($input, 'phone', 'Telephone', $errors);
    check_required($input, 'password', 'Password', $errors);
    check_password($input, 'password', 'Password', $errors);
    check_required($input, 'role', 'Account type', $errors);
    check_choice($input, 'role', 'Account type', array('alumni', 'student', 'employee', 'school_leader'), $errors);
    check_year($input, 'graduationYear', 'Graduation year', $errors);
    check_required($input, 'department', 'Department', $errors);
    check_required($input, 'currentRole', 'Current role', $errors);
    check_required($input, 'company', 'Organization', $errors);
    check_text_length($input, 'bio', 'Bio', 2000, $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $email = strtolower(input_value($input, 'email'));
    $existing = db_value('SELECT `id` FROM `users` WHERE `email` = ? LIMIT 1', 's', array($email));
    if ($existing !== null) {
        reply_error('An account already uses that email address.', 409);
    }

    $role_id = db_value('SELECT `id` FROM `roles` WHERE `code` = ? LIMIT 1', 's', array(input_value($input, 'role')));
    if ($role_id === null) {
        reply_error('That account type is not available.', 422);
    }

    $department_id = db_value('SELECT `id` FROM `departments` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'department')));
    $programme_id = db_value('SELECT `id` FROM `programmes` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'programme')));
    $sector_id = null;
    if (input_value($input, 'sector') !== '') {
        $sector_id = db_value('SELECT `id` FROM `sectors` WHERE `name` = ? LIMIT 1', 's', array(input_value($input, 'sector')));
    }

    $reg_no = input_value($input, 'regNo');
    if ($reg_no === '') {
        $reg_no = null;
    }

    $user_id = db_insert(
        'INSERT INTO `users` (`role_id`, `full_name`, `email`, `phone`, `password_hash`, `status`)
         VALUES (?, ?, ?, ?, ?, \'active\')',
        'issss',
        array(
            $role_id,
            input_value($input, 'fullName'),
            $email,
            input_value($input, 'phone'),
            hash_password(input_value($input, 'password')),
        )
    );

    db_query(
        'INSERT INTO `alumni_profiles`
            (`user_id`, `reg_no`, `graduation_year`, `department_id`, `programme_id`, `sector_id`,
             `current_role`, `current_company`, `location`, `bio`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        'isiiiissss',
        array(
            $user_id,
            $reg_no,
            input_int($input, 'graduationYear'),
            $department_id,
            $programme_id,
            $sector_id,
            input_value($input, 'currentRole'),
            input_value($input, 'company'),
            input_value($input, 'location'),
            input_value($input, 'bio'),
        )
    );

    foreach (split_list(input_value($input, 'skills')) as $skill_name) {
        $skill_id = find_or_create_skill($skill_name);
        if ($skill_id !== null) {
            db_query(
                'INSERT IGNORE INTO `user_skills` (`user_id`, `skill_id`) VALUES (?, ?)',
                'ii',
                array($user_id, $skill_id)
            );
        }
    }

    $order = 0;
    foreach (split_list(input_value($input, 'educationHistory')) as $line) {
        db_query(
            'INSERT INTO `education_records` (`user_id`, `qualification`, `institution`, `start_year`, `end_year`, `sort_order`)
             VALUES (?, ?, ?, ?, ?, ?)',
            'issiii',
            array(
                $user_id,
                $line,
                input_value($input, 'institution', 'RP Kigali College'),
                input_int($input, 'graduationYear'),
                input_int($input, 'graduationYear'),
                $order,
            )
        );
        $order++;
    }

    foreach (split_list(input_value($input, 'jobHistory')) as $line) {
        $is_current = stripos($line, 'current') !== false ? 1 : 0;
        $end_date = $is_current === 1 ? null : date('Y-m-d');
        db_query(
            'INSERT INTO `employment_records` (`user_id`, `job_title`, `company`, `sector_id`, `location`, `start_date`, `end_date`, `is_current`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            'ississsi',
            array(
                $user_id,
                $line,
                input_value($input, 'company'),
                $sector_id,
                input_value($input, 'location'),
                date('Y-m-d'),
                $end_date,
                $is_current,
            )
        );
    }

    foreach (split_list(input_value($input, 'posts')) as $post_body) {
        db_query(
            'INSERT INTO `posts` (`author_id`, `body`, `status`) VALUES (?, ?, \'published\')',
            'is',
            array($user_id, $post_body)
        );
    }

    $member = db_one('SELECT * FROM `v_alumni_directory` WHERE `user_id` = ? LIMIT 1', 'i', array($user_id));
    $rows = $member !== null ? attach_skills_to_rows(array($member)) : array();
    $created = count($rows) > 0 ? $rows[0] : null;

    reply_ok(array('member' => $created), 'Member added to the directory.', 201);
}

/*
 * Replaces the education history of the signed in user.
 */
function endpoint_update_education()
{
    $user = require_permission('profile.edit');
    $input = read_input();

    db_query('DELETE FROM `education_records` WHERE `user_id` = ?', 'i', array($user['id']));

    $order = 0;

    if (isset($input['items']) && is_array($input['items'])) {
        foreach ($input['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $qualification = isset($item['qualification']) ? trim((string) $item['qualification']) : '';
            if ($qualification === '') {
                continue;
            }
            $institution = isset($item['institution']) ? trim((string) $item['institution']) : 'RP Kigali College';
            $start_year = isset($item['startYear']) && $item['startYear'] !== '' ? (int) $item['startYear'] : null;
            $end_year = isset($item['endYear']) && $item['endYear'] !== '' ? (int) $item['endYear'] : null;
            $grade = isset($item['grade']) && trim((string) $item['grade']) !== '' ? trim((string) $item['grade']) : null;
            $description = isset($item['description']) && trim((string) $item['description']) !== '' ? trim((string) $item['description']) : null;

            db_query(
                'INSERT INTO `education_records` (`user_id`, `qualification`, `institution`, `start_year`, `end_year`, `grade`, `description`, `sort_order`)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                'issiissi',
                array($user['id'], $qualification, $institution, $start_year, $end_year, $grade, $description, $order)
            );
            $order++;
        }
    } else {
        foreach (split_list(input_value($input, 'educationHistory')) as $line) {
            db_query(
                'INSERT INTO `education_records` (`user_id`, `qualification`, `institution`, `start_year`, `end_year`, `description`, `sort_order`)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                'issiisi',
                array(
                    $user['id'],
                    $line,
                    input_value($input, 'institution', $line),
                    input_int($input, 'startYear'),
                    input_int($input, 'endYear'),
                    null,
                    $order,
                )
            );

            $order++;
        }
    }

    reply_ok(null, 'Education history updated.');
}

/*
 * Replaces the employment history of the signed in user.
 */
function endpoint_update_employment()
{
    $user = require_permission('profile.edit');
    $input = read_input();

    db_query('DELETE FROM `employment_records` WHERE `user_id` = ?', 'i', array($user['id']));

    if (isset($input['items']) && is_array($input['items'])) {
        foreach ($input['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $job_title = isset($item['jobTitle']) ? trim((string) $item['jobTitle']) : '';
            if ($job_title === '') {
                continue;
            }
            $company = isset($item['company']) ? trim((string) $item['company']) : '';
            $location = isset($item['location']) ? trim((string) $item['location']) : '';
            $start_date = isset($item['startDate']) && trim((string) $item['startDate']) !== '' ? trim((string) $item['startDate']) : date('Y-m-d');
            $is_current = !empty($item['isCurrent']) ? 1 : 0;
            $end_date = $is_current === 1 ? null : (isset($item['endDate']) && trim((string) $item['endDate']) !== '' ? trim((string) $item['endDate']) : date('Y-m-d'));
            $responsibilities = isset($item['responsibilities']) && trim((string) $item['responsibilities']) !== '' ? trim((string) $item['responsibilities']) : null;

            db_query(
                'INSERT INTO `employment_records` (`user_id`, `job_title`, `company`, `location`, `start_date`, `end_date`, `is_current`, `responsibilities`)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                'isssssis',
                array($user['id'], $job_title, $company, $location, $start_date, $end_date, $is_current, $responsibilities)
            );
        }
    } else {
        foreach (split_list(input_value($input, 'jobHistory')) as $line) {
            $is_current = stripos($line, 'current') !== false ? 1 : 0;
            $end_date = $is_current === 1 ? null : date('Y-m-d');

            db_query(
                'INSERT INTO `employment_records` (`user_id`, `job_title`, `company`, `location`, `start_date`, `end_date`, `is_current`, `responsibilities`)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                'isssssis',
                array(
                    $user['id'],
                    $line,
                    input_value($input, 'company'),
                    input_value($input, 'location'),
                    date('Y-m-d'),
                    $end_date,
                    $is_current,
                    null,
                )
            );
        }
    }

    reply_ok(null, 'Employment history updated.');
}

/*
 * Sends a connection request to another member.
 */
function endpoint_send_connection($target_id)
{
    $user = require_permission('connections.manage');

    if ((int) $target_id === (int) $user['id']) {
        reply_error('You cannot connect with your own account.', 422);
    }

    $target = db_one('SELECT `id` FROM `users` WHERE `id` = ? AND `status` = \'active\'', 'i', array($target_id));

    if ($target === null) {
        reply_error('That member was not found.', 404);
    }

    $existing = db_one(
        'SELECT * FROM `connections`
          WHERE (`requester_id` = ? AND `addressee_id` = ?)
             OR (`requester_id` = ? AND `addressee_id` = ?)
          LIMIT 1',
        'iiii',
        array($user['id'], $target_id, $target_id, $user['id'])
    );

    if ($existing !== null && $existing['status'] === 'pending') {
        reply_error('A connection request is already waiting for that member.', 409);
    }

    if ($existing !== null && $existing['status'] === 'accepted') {
        reply_error('You are already connected with that member.', 409);
    }

    if ($existing !== null) {
        db_query(
            'UPDATE `connections` SET `requester_id` = ?, `addressee_id` = ?, `status` = \'pending\', `responded_at` = NULL, `created_at` = NOW()
              WHERE `id` = ?',
            'iii',
            array($user['id'], $target_id, $existing['id'])
        );

        reply_ok(array('connection_id' => (int) $existing['id']), 'Connection request sent.');
    }

    $id = db_insert(
        'INSERT INTO `connections` (`requester_id`, `addressee_id`, `status`, `message`) VALUES (?, ?, \'pending\', ?)',
        'iis',
        array($user['id'], $target_id, input_value(read_input(), 'message'))
    );

    reply_ok(array('connection_id' => $id), 'Connection request sent.', 201);
}

/*
 * Accepts or rejects a connection request that was sent to the signed in
 * user, and lists the requests.
 */
function endpoint_connections($action = '')
{
    $user = require_permission('connections.manage');

    if ($action === 'respond') {
        $input = read_input();
        $errors = array();

        check_required($input, 'connectionId', 'Connection', $errors);
        check_choice($input, 'decision', 'Decision', array('accepted', 'rejected'), $errors);

        stop_if_errors($errors, 'Please fix the highlighted fields.');

        $connection = db_one(
            'SELECT * FROM `connections` WHERE `id` = ? AND `addressee_id` = ? LIMIT 1',
            'ii',
            array(input_int($input, 'connectionId'), $user['id'])
        );

        if ($connection === null) {
            reply_error('That connection request was not found.', 404);
        }

        db_query(
            'UPDATE `connections` SET `status` = ?, `responded_at` = NOW() WHERE `id` = ?',
            'si',
            array(input_value($input, 'decision'), $connection['id'])
        );

        reply_ok(null, 'Connection request updated.');
    }

    $requests = db_all(
        'SELECT c.*, u.`full_name` AS `other_name`, u.`email` AS `other_email`
           FROM `connections` c
           JOIN `users` u ON u.`id` = c.`requester_id`
          WHERE c.`addressee_id` = ? AND c.`status` = \'pending\'
          ORDER BY c.`created_at` DESC',
        'i',
        array($user['id'])
    );

    $connections = db_all(
        'SELECT c.*, u.`full_name` AS `other_name`, u.`email` AS `other_email`
           FROM `connections` c
           JOIN `users` u ON u.`id` = IF(c.`requester_id` = ?, c.`addressee_id`, c.`requester_id`)
          WHERE (c.`requester_id` = ? OR c.`addressee_id` = ?) AND c.`status` = \'accepted\'
          ORDER BY c.`responded_at` DESC',
        'iii',
        array($user['id'], $user['id'], $user['id'])
    );

    reply_ok(array('requests' => $requests, 'connections' => $connections));
}

/*
 * Lists all user accounts for administration (active, pending, suspended).
 */
function endpoint_users()
{
    require_permission('users.manage');

    $search = query_value('search');
    $status = query_value('status');
    $role = query_value('role');

    $where = array('1 = 1');
    $types = '';
    $params = array();

    if ($search !== '') {
        $where[] = '(u.`full_name` LIKE ? OR u.`email` LIKE ?)';
        $like = '%' . $search . '%';
        $types .= 'ss';
        $params[] = $like;
        $params[] = $like;
    }

    if ($status !== '' && $status !== 'all') {
        $where[] = 'u.`status` = ?';
        $types .= 's';
        $params[] = $status;
    }

    if ($role !== '' && $role !== 'all') {
        $where[] = 'r.`code` = ?';
        $types .= 's';
        $params[] = $role;
    }

    $users = db_all(
        'SELECT u.`id`, u.`full_name`, u.`email`, u.`phone`, u.`status`, u.`last_login_at`, u.`created_at`,
                r.`code` AS `role_code`, r.`label` AS `role_label`,
                d.`name` AS `department_name`, p.`graduation_year`, p.`reg_no`
           FROM `users` u
           JOIN `roles` r ON r.`id` = u.`role_id`
           LEFT JOIN `alumni_profiles` p ON p.`user_id` = u.`id`
           LEFT JOIN `departments` d ON d.`id` = p.`department_id`
          WHERE ' . implode(' AND ', $where) . '
          ORDER BY u.`created_at` DESC, u.`id` DESC',
        $types,
        $params
    );

    reply_ok(array('users' => $users));
}

/*
 * Activates or suspends a user account and revokes active tokens when suspended.
 */
function endpoint_update_user_status($target_id)
{
    $admin = require_permission('users.manage');
    $input = read_input();
    $errors = array();

    check_required($input, 'status', 'Status', $errors);
    check_choice($input, 'status', 'Status', array('active', 'pending', 'suspended'), $errors);
    stop_if_errors($errors, 'Please select a valid status.');

    if ((int) $target_id === (int) $admin['id']) {
        reply_error('You cannot change the status of your own account.', 422);
    }

    $target = db_one('SELECT `id`, `status` FROM `users` WHERE `id` = ? LIMIT 1', 'i', array($target_id));
    if ($target === null) {
        reply_error('User account not found.', 404);
    }

    $new_status = input_value($input, 'status');
    db_query('UPDATE `users` SET `status` = ? WHERE `id` = ?', 'si', array($new_status, $target_id));

    if ($new_status !== 'active') {
        db_query('UPDATE `user_sessions` SET `revoked_at` = NOW() WHERE `user_id` = ?', 'i', array($target_id));
    }

    audit_log_action($admin['id'], 'user.status_updated', 'users', $target_id, $new_status);

    reply_ok(null, 'User status updated.');
}

/*
 * Changes the role of a user account.
 */
function endpoint_update_user_role($target_id)
{
    $admin = require_permission('users.manage');
    $input = read_input();
    $errors = array();

    check_required($input, 'role', 'Role', $errors);
    check_choice($input, 'role', 'Role', array('administrator', 'alumni', 'student', 'employee', 'school_leader'), $errors);
    stop_if_errors($errors, 'Please select a valid role.');

    if ((int) $target_id === (int) $admin['id']) {
        reply_error('You cannot change your own administrator role here.', 422);
    }

    $role_id = db_value('SELECT `id` FROM `roles` WHERE `code` = ? LIMIT 1', 's', array(input_value($input, 'role')));
    if ($role_id === null) {
        reply_error('That role is not configured.', 422);
    }

    db_query('UPDATE `users` SET `role_id` = ? WHERE `id` = ?', 'ii', array((int) $role_id, $target_id));
    audit_log_action($admin['id'], 'user.role_updated', 'users', $target_id, input_value($input, 'role'));

    reply_ok(null, 'User role updated.');
}
