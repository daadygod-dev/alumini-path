<?php
/*
 * Alumini-Path :: authentication helpers
 *
 * Passwords are hashed with password_hash().
 * Sessions use a random token. Only the hash of the token is stored in
 * the database, so a leaked table cannot be replayed as a login.
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';

/*
 * Creates a session token for a user and returns it.
 */
function create_session_token($user_id)
{
    $token = bin2hex(random_bytes(32));
    $token_hash = hash('sha256', $token);
    $expires_at = date('Y-m-d H:i:s', time() + 43200);

    $user_agent = '';
    if (isset($_SERVER['HTTP_USER_AGENT'])) {
        $user_agent = substr($_SERVER['HTTP_USER_AGENT'], 0, 255);
    }

    $ip_address = '';
    if (isset($_SERVER['REMOTE_ADDR'])) {
        $ip_address = substr($_SERVER['REMOTE_ADDR'], 0, 45);
    }

    db_query(
        'INSERT INTO `user_sessions` (`user_id`, `token_hash`, `user_agent`, `ip_address`, `expires_at`)
         VALUES (?, ?, ?, ?, ?)',
        'issss',
        array($user_id, $token_hash, $user_agent, $ip_address, $expires_at)
    );

    db_query('UPDATE `users` SET `last_login_at` = NOW() WHERE `id` = ?', 'i', array($user_id));

    return array(
        'token'      => $token,
        'expires_at' => $expires_at,
    );
}

/*
 * Reads the token from the Authorization header or the session cookie.
 */
function read_token()
{
    $header = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }

    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }

    if (isset($_COOKIE['alumni_token'])) {
        return trim($_COOKIE['alumni_token']);
    }

    return '';
}

/*
 * Returns the signed in user, or null when there is no valid session.
 * The result is cached so several calls in one request cost one query.
 */
function current_user()
{
    if (isset($GLOBALS['current_user'])) {
        return $GLOBALS['current_user'];
    }

    $GLOBALS['current_user'] = null;

    $token = read_token();

    if ($token === '') {
        return null;
    }

    $row = db_one(
        'SELECT u.`id`, u.`full_name`, u.`email`, u.`phone`, u.`role_id`, u.`status`,
                r.`code` AS `role_code`, r.`label` AS `role_label`
           FROM `user_sessions` s
           JOIN `users` u ON u.`id` = s.`user_id`
           JOIN `roles` r ON r.`id` = u.`role_id`
          WHERE s.`token_hash` = ?
            AND s.`revoked_at` IS NULL
            AND s.`expires_at` > NOW()
            AND u.`status` = \'active\'
          LIMIT 1',
        's',
        array(hash('sha256', $token))
    );

    if ($row !== null) {
        $GLOBALS['current_user'] = $row;
    }

    return $GLOBALS['current_user'];
}

/*
 * Returns the signed in user or stops the request with a 401.
 */
function require_login()
{
    $user = current_user();

    if ($user === null) {
        reply_error('You need to sign in first.', 401);
    }

    return $user;
}

/*
 * Checks whether a role holds a permission from the role_permissions table.
 */
function role_can($role_code, $permission)
{
    $found = db_value(
        'SELECT 1 FROM `role_permissions` rp
           JOIN `roles` r ON r.`id` = rp.`role_id`
          WHERE r.`code` = ? AND rp.`permission_code` = ?
          LIMIT 1',
        'ss',
        array($role_code, $permission)
    );

    return $found !== null;
}

/*
 * Stops the request unless the signed in user holds the permission.
 */
function require_permission($permission)
{
    $user = require_login();

    if (!role_can($user['role_code'], $permission)) {
        reply_error('You do not have permission for this action.', 403);
    }

    return $user;
}

/*
 * Stops the request unless the signed in user is an administrator.
 */
function require_admin()
{
    $user = require_login();

    if ($user['role_code'] !== 'administrator' && $user['role_code'] !== 'school_leader') {
        reply_error('Administrator access is required.', 403);
    }

    return $user;
}

/*
 * Hashes a password for storage.
 */
function hash_password($password)
{
    return password_hash($password, PASSWORD_DEFAULT);
}

/*
 * Checks a plain password against a stored hash.
 */
function verify_password($password, $stored_hash)
{
    return password_verify($password, $stored_hash);
}

/*
 * Marks a session token as revoked so it cannot be used again.
 */
function revoke_token($token)
{
    if ($token === '') {
        return;
    }

    db_query(
        'UPDATE `user_sessions` SET `revoked_at` = NOW() WHERE `token_hash` = ? AND `revoked_at` IS NULL',
        's',
        array(hash('sha256', $token))
    );
}
