<?php
/*
 * Alumini-Path :: register, sign in, sign out, password reset.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/validation.php';
require_once __DIR__ . '/../config/auth.php';

/*
 * Creates an account.
 */
function endpoint_register()
{
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

    $full_name = input_value($input, 'fullName');
    $phone = input_value($input, 'phone');
    $password_hash = hash_password(input_value($input, 'password'));
    $graduation_year = input_int($input, 'graduationYear');
    $current_role = input_value($input, 'currentRole');
    $company = input_value($input, 'company');
    $location = input_value($input, 'location');
    $bio = input_value($input, 'bio');

    $user_id = db_insert(
        'INSERT INTO `users` (`role_id`, `full_name`, `email`, `phone`, `password_hash`, `status`)
         VALUES (?, ?, ?, ?, ?, \'active\')',
        'issss',
        array($role_id, $full_name, $email, $phone, $password_hash)
    );

    $reg_no = input_value($input, 'regNo');
    if ($reg_no === '') {
        $reg_no = null;
    }

    db_query(
        'INSERT INTO `alumni_profiles`
            (`user_id`, `reg_no`, `graduation_year`, `department_id`, `programme_id`, `sector_id`,
             `current_role`, `current_company`, `location`, `bio`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        'isiiiissss',
        array(
            $user_id,
            $reg_no,
            $graduation_year,
            $department_id,
            $programme_id,
            $sector_id,
            $current_role,
            $company,
            $location,
            $bio,
        )
    );

    $skills = split_list(input_value($input, 'skills'));

    foreach ($skills as $skill_name) {
        $skill_id = find_or_create_skill($skill_name);

        if ($skill_id !== null) {
            db_query(
                'INSERT IGNORE INTO `user_skills` (`user_id`, `skill_id`) VALUES (?, ?)',
                'ii',
                array($user_id, $skill_id)
            );
        }
    }

    $user = db_one(
        'SELECT u.`id`, u.`full_name`, u.`email`, u.`phone`, r.`code` AS `role_code`, r.`label` AS `role_label`
           FROM `users` u
           JOIN `roles` r ON r.`id` = u.`role_id`
          WHERE u.`id` = ?',
        'i',
        array($user_id)
    );

    $session = create_session_token($user_id);

    reply_ok(
        array('user' => $user, 'session' => $session),
        'Account created successfully.',
        201
    );
}

/*
 * Signs a user in and returns a session token.
 */
function endpoint_sign_in()
{
    $input = read_input();
    $errors = array();

    check_required($input, 'email', 'Email', $errors);
    check_email($input, 'email', 'Email', $errors);
    check_required($input, 'password', 'Password', $errors);

    stop_if_errors($errors, 'Enter a valid email address and password.');

    $email = strtolower(input_value($input, 'email'));

    $user = db_one(
        'SELECT u.`id`, u.`full_name`, u.`email`, u.`phone`, u.`role_id`, u.`password_hash`, u.`status`,
                r.`code` AS `role_code`, r.`label` AS `role_label`
           FROM `users` u
           JOIN `roles` r ON r.`id` = u.`role_id`
          WHERE u.`email` = ?
          LIMIT 1',
        's',
        array($email)
    );

    if ($user === null || !verify_password(input_value($input, 'password'), $user['password_hash'])) {
        reply_error('Email or password is incorrect.', 401);
    }

    if ($user['status'] !== 'active') {
        reply_error('This account is not active. Contact the administrator.', 403);
    }

    unset($user['password_hash']);

    $session = create_session_token($user['id']);
    audit_log_action($user['id'], 'user.signin', 'users', $user['id'], $user['role_code']);

    reply_ok(array('user' => $user, 'session' => $session), 'Signed in successfully.');
}

/*
 * Ends the current session.
 */
function endpoint_sign_out()
{
    revoke_token(read_token());

    reply_ok(null, 'Signed out successfully.');
}

/*
 * Returns the signed in user with the full profile.
 */
function endpoint_me()
{
    $user = require_login();

    $profile = db_one(
        'SELECT p.*, d.`name` AS `department_name`, pr.`name` AS `programme_name`, s.`name` AS `sector_name`
           FROM `alumni_profiles` p
           LEFT JOIN `departments` d ON d.`id` = p.`department_id`
           LEFT JOIN `programmes` pr ON pr.`id` = p.`programme_id`
           LEFT JOIN `sectors` s ON s.`id` = p.`sector_id`
          WHERE p.`user_id` = ?',
        'i',
        array($user['id'])
    );

    if ($profile !== null && isset($profile['avatar_file_id']) && (int) $profile['avatar_file_id'] > 0) {
        $profile['avatar_url'] = 'api/files.php?id=' . (int) $profile['avatar_file_id'];
    } elseif ($profile !== null) {
        $profile['avatar_url'] = '';
    }

    $skills = db_all(
        'SELECT s.`id`, s.`name` FROM `user_skills` us JOIN `skills` s ON s.`id` = us.`skill_id`
          WHERE us.`user_id` = ? ORDER BY s.`name`',
        'i',
        array($user['id'])
    );

    $education = db_all(
        'SELECT * FROM `education_records` WHERE `user_id` = ? ORDER BY `sort_order`, `id`',
        'i',
        array($user['id'])
    );

    $employment = db_all(
        'SELECT e.*, s.`name` AS `sector_name`
           FROM `employment_records` e
           LEFT JOIN `sectors` s ON s.`id` = e.`sector_id`
          WHERE e.`user_id` = ?
          ORDER BY e.`start_date` DESC, e.`id` DESC',
        'i',
        array($user['id'])
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
        array($user['id'])
    );

    $permissions = db_all(
        'SELECT rp.`permission_code` FROM `role_permissions` rp
           JOIN `roles` r ON r.`id` = rp.`role_id`
          WHERE r.`code` = ?',
        's',
        array($user['role_code'])
    );

    $permission_list = array();

    foreach ($permissions as $row) {
        $permission_list[] = $row['permission_code'];
    }

    reply_ok(array(
        'user'        => $user,
        'profile'     => $profile,
        'skills'      => $skills,
        'education'   => $education,
        'employment'  => $employment,
        'posts'       => $posts,
        'permissions' => $permission_list,
    ));
}

/*
 * Returns department, programme, sector, and public account-type lookup lists
 * directly from the database so forms stay in sync with MySQL.
 */
function endpoint_lookups()
{
    $departments = db_all('SELECT `id`, `code`, `name` FROM `departments` ORDER BY `name`');
    $programmes = db_all('SELECT `id`, `department_id`, `code`, `name` FROM `programmes` ORDER BY `name`');
    $sectors = db_all('SELECT `id`, `code`, `name` FROM `sectors` ORDER BY `name`');
    $roles = db_all(
        'SELECT `code`, `label` FROM `roles`
          WHERE `code` IN (\'alumni\', \'student\', \'employee\', \'school_leader\')
          ORDER BY `id`'
    );

    reply_ok(array(
        'departments' => $departments,
        'programmes'  => $programmes,
        'sectors'     => $sectors,
        'roles'       => $roles,
    ));
}

/*
 * Starts a password reset. The answer is the same whether or not the
 * email is registered, so the endpoint cannot be used to look up users.
 */
function endpoint_forgot_password()
{
    $input = read_input();
    $errors = array();

    check_required($input, 'email', 'Email', $errors);
    check_email($input, 'email', 'Email', $errors);

    stop_if_errors($errors, 'Enter a valid email address.');

    $email = strtolower(input_value($input, 'email'));

    $user = db_one('SELECT `id` FROM `users` WHERE `email` = ? LIMIT 1', 's', array($email));

    if ($user !== null) {
        $token = bin2hex(random_bytes(32));

        db_query(
            'INSERT INTO `password_resets` (`user_id`, `email`, `token_hash`, `expires_at`)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
            'iss',
            array($user['id'], $email, hash('sha256', $token))
        );

        // A real deployment sends this by email.
        error_log('[alumni-path] password reset token for ' . $email . ': ' . $token);
    }

    reply_ok(null, 'If that address is registered, a reset token has been created.');
}

/*
 * Finishes a password reset using the token from the email.
 */
function endpoint_reset_password()
{
    $input = read_input();
    $errors = array();

    check_required($input, 'token', 'Reset token', $errors);
    check_required($input, 'password', 'Password', $errors);
    check_password($input, 'password', 'Password', $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $reset = db_one(
        'SELECT `id`, `user_id` FROM `password_resets`
          WHERE `token_hash` = ? AND `used_at` IS NULL AND `expires_at` > NOW()
          LIMIT 1',
        's',
        array(hash('sha256', input_value($input, 'token')))
    );

    if ($reset === null) {
        reply_error('That reset token is invalid or has expired.', 422);
    }

    db_query(
        'UPDATE `users` SET `password_hash` = ? WHERE `id` = ?',
        'si',
        array(hash_password(input_value($input, 'password')), $reset['user_id'])
    );

    db_query('UPDATE `password_resets` SET `used_at` = NOW() WHERE `id` = ?', 'i', array($reset['id']));
    db_query('UPDATE `user_sessions` SET `revoked_at` = NOW() WHERE `user_id` = ?', 'i', array($reset['user_id']));
    audit_log_action($reset['user_id'], 'user.password_reset', 'users', $reset['user_id'], '');

    reply_ok(null, 'Password updated. Sign in with the new password.');
}

/*
 * Allows a signed in user to update their own password after confirming
 * their current password.
 */
function endpoint_change_password()
{
    $user = require_login();
    $input = read_input();
    $errors = array();

    check_required($input, 'currentPassword', 'Current password', $errors);
    check_required($input, 'newPassword', 'New password', $errors);
    check_password($input, 'newPassword', 'New password', $errors);

    stop_if_errors($errors, 'Please fix the highlighted fields.');

    $row = db_one('SELECT `password_hash` FROM `users` WHERE `id` = ? LIMIT 1', 'i', array($user['id']));

    if ($row === null || !verify_password(input_value($input, 'currentPassword'), $row['password_hash'])) {
        reply_error('Current password is incorrect.', 422);
    }

    db_query(
        'UPDATE `users` SET `password_hash` = ? WHERE `id` = ?',
        'si',
        array(hash_password(input_value($input, 'newPassword')), $user['id'])
    );

    audit_log_action($user['id'], 'user.password_changed', 'users', $user['id'], '');

    reply_ok(null, 'Password changed successfully.');
}
