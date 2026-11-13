<?php
/*
 * Alumini-Path :: small helper functions used by every endpoint.
 */

/*
 * Adds CORS headers for cross-origin frontends (such as Vercel) and
 * answers browser OPTIONS preflight requests immediately.
 */
function send_cors_headers()
{
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
    $allowed_raw = getenv('CORS_ALLOWED_ORIGINS');

    if ($allowed_raw === false || trim($allowed_raw) === '') {
        $allowed_raw = '*';
    }

    if (trim($allowed_raw) === '*') {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin !== '') {
        $allowed_list = split_list($allowed_raw);

        if (in_array($origin, $allowed_list, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');

    if (isset($_SERVER['REQUEST_METHOD']) && strtoupper($_SERVER['REQUEST_METHOD']) === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/*
 * Sends a JSON answer and stops the script.
 */
function reply_json($payload, $http_code = 200)
{
    http_response_code($http_code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Cache-Control: no-store');
    echo json_encode($payload);
    exit;
}

/*
 * Records a security or administration action in the audit log.
 */
function audit_log_action($actor_id, $action, $entity_type, $entity_id = null, $metadata = '')
{
    $ip_address = isset($_SERVER['REMOTE_ADDR']) ? substr($_SERVER['REMOTE_ADDR'], 0, 45) : '';

    db_query(
        'INSERT INTO `audit_log` (`actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `ip_address`)
         VALUES (?, ?, ?, ?, ?, ?)',
        'ississ',
        array($actor_id, $action, $entity_type, $entity_id, $metadata, $ip_address)
    );
}

/*
 * Sends a successful answer.
 */
function reply_ok($data = null, $message = 'OK', $http_code = 200)
{
    reply_json(array(
        'success' => true,
        'message' => $message,
        'data'    => $data,
    ), $http_code);
}

/*
 * Sends a failed answer.
 */
function reply_error($message, $http_code = 400, $errors = array())
{
    reply_json(array(
        'success' => false,
        'message' => $message,
        'errors'  => $errors,
    ), $http_code);
}

/*
 * Reads the request body. Accepts JSON posts and normal form posts.
 */
function read_input()
{
    $raw = file_get_contents('php://input');
    $content_type = '';

    if (isset($_SERVER['CONTENT_TYPE'])) {
        $content_type = $_SERVER['CONTENT_TYPE'];
    }

    if ($raw !== false && $raw !== '' && strpos($content_type, 'application/json') !== false) {
        $decoded = json_decode($raw, true);

        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return $_POST;
}

/*
 * Reads a value from the input array. Returns $default when it is missing.
 */
function input_value($input, $field, $default = '')
{
    if (!isset($input[$field])) {
        return $default;
    }

    $value = $input[$field];

    if (is_string($value)) {
        return trim($value);
    }

    return $value;
}

/*
 * Reads a whole number from the input array. Returns null when missing.
 */
function input_int($input, $field)
{
    $value = input_value($input, $field, '');

    if ($value === '' || !is_numeric($value)) {
        return null;
    }

    return (int) $value;
}

/*
 * Reads a value from the query string.
 */
function query_value($field, $default = '')
{
    if (!isset($_GET[$field])) {
        return $default;
    }

    return trim($_GET[$field]);
}

/*
 * Reads a whole number from the query string.
 */
function query_int($field, $default = 0)
{
    $value = query_value($field, '');

    if ($value === '' || !is_numeric($value)) {
        return $default;
    }

    return (int) $value;
}

/*
 * Turns a comma separated list into an array of clean values.
 */
function split_list($text)
{
    if (!is_string($text) || trim($text) === '') {
        return array();
    }

    $parts = explode(',', $text);
    $clean = array();

    foreach ($parts as $part) {
        $part = trim($part);

        if ($part !== '') {
            $clean[] = $part;
        }
    }

    return $clean;
}

/*
 * Finds a skill id by name. Creates the skill when it is new.
 */
function find_or_create_skill($name)
{
    $name = trim($name);

    if ($name === '') {
        return null;
    }

    $id = db_value('SELECT `id` FROM `skills` WHERE `name` = ? LIMIT 1', 's', array($name));

    if ($id !== null) {
        return (int) $id;
    }

    return db_insert('INSERT INTO `skills` (`name`) VALUES (?)', 's', array($name));
}
