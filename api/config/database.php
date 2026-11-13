<?php
/*
 * Alumini-Path :: database connection settings
 *
 * Edit these four values if your MySQL account is different.
 * The XAMPP default is root with an empty password.
 */

$db_host = '127.0.0.1';
$db_port = 3306;
$db_name = 'alumni_network';
$db_user = 'root';
$db_pass = '';

/*
 * Opens one connection to MySQL and keeps it in $GLOBALS['db'].
 * Every other file uses that same connection.
 */
function db_connect()
{
    global $db_host, $db_port, $db_name, $db_user, $db_pass;

    mysqli_report(MYSQLI_REPORT_OFF);

    $connection = mysqli_connect($db_host, $db_user, $db_pass, $db_name, $db_port);

    if ($connection === false) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array(
            'success' => false,
            'message' => 'Database connection failed: ' . mysqli_connect_error(),
        ));
        exit;
    }

    mysqli_set_charset($connection, 'utf8mb4');

    return $connection;
}

/*
 * Returns the shared connection, creating it on the first call.
 */
function db()
{
    if (!isset($GLOBALS['db']) || $GLOBALS['db'] === false) {
        $GLOBALS['db'] = db_connect();
    }

    return $GLOBALS['db'];
}

/*
 * Stops the script with a JSON error when a SQL query fails.
 */
function db_fail($message)
{
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array(
        'success' => false,
        'message' => $message,
    ));
    exit;
}

/*
 * Runs a prepared statement and returns it.
 *
 * $sql    the query with ? placeholders
 * $types  string of type letters: s = string, i = integer, d = double
 * $params the values, in the same order as the placeholders
 */
function db_query($sql, $types = '', $params = array())
{
    $connection = db();
    $statement = mysqli_prepare($connection, $sql);

    if ($statement === false) {
        db_fail('Database prepare failed: ' . mysqli_error($connection));
    }

    if (is_array($types)) {
        $types = implode('', $types);
    }

    if (count($params) > 0) {
        if ($types === '') {
            foreach ($params as $value) {
                if (is_int($value)) {
                    $types .= 'i';
                } elseif (is_float($value)) {
                    $types .= 'd';
                } else {
                    $types .= 's';
                }
            }
        }

        // Bind each value in $params to the ? placeholders in $sql.
        mysqli_stmt_bind_param($statement, $types, ...$params);
    }

    if (!mysqli_stmt_execute($statement)) {
        $error = mysqli_stmt_error($statement);
        mysqli_stmt_close($statement);
        db_fail('Database query failed: ' . $error);
    }

    return $statement;
}

/*
 * Runs a query and returns all rows as an array of arrays.
 */
function db_all($sql, $types = '', $params = array())
{
    $statement = db_query($sql, $types, $params);
    $result = mysqli_stmt_get_result($statement);
    $rows = array();

    if ($result !== false) {
        $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
        mysqli_free_result($result);
    }

    mysqli_stmt_close($statement);

    return $rows;
}

/*
 * Runs a query and returns the first row, or null when nothing matched.
 */
function db_one($sql, $types = '', $params = array())
{
    $statement = db_query($sql, $types, $params);
    $result = mysqli_stmt_get_result($statement);
    $row = null;

    if ($result !== false) {
        $fetched = mysqli_fetch_assoc($result);
        if ($fetched !== null) {
            $row = $fetched;
        }
        mysqli_free_result($result);
    }

    mysqli_stmt_close($statement);

    return $row;
}

/*
 * Runs a query and returns a single value from the first row.
 */
function db_value($sql, $types = '', $params = array())
{
    $statement = db_query($sql, $types, $params);
    $result = mysqli_stmt_get_result($statement);
    $value = null;

    if ($result !== false) {
        $row = mysqli_fetch_row($result);
        if ($row !== null) {
            $value = $row[0];
        }
        mysqli_free_result($result);
    }

    mysqli_stmt_close($statement);

    return $value;
}

/*
 * Runs an INSERT and returns the new id.
 */
function db_insert($sql, $types = '', $params = array())
{
    $statement = db_query($sql, $types, $params);
    $id = mysqli_insert_id(db());
    mysqli_stmt_close($statement);

    return $id;
}

/*
 * Runs an UPDATE or DELETE and returns how many rows changed.
 */
function db_change($sql, $types = '', $params = array())
{
    $statement = db_query($sql, $types, $params);
    $affected = mysqli_stmt_affected_rows($statement);
    mysqli_stmt_close($statement);

    return $affected;
}
