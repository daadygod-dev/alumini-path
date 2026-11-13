<?php
/*
 * Alumini-Path :: database installer
 *
 * Creates the database, runs the schema and loads the demo data.
 * Run it from the browser: http://localhost/alumini/alumini-path/api/database/install.php
 *
 * Delete this file after the installation is done.
 */

require_once __DIR__ . '/../config/database.php';

$messages = array();

/*
 * Reads a .sql file and splits it into separate statements.
 */
function read_sql_file($path)
{
    $sql = file_get_contents($path);

    if ($sql === false) {
        return array();
    }

    // Remove comment lines that start with --
    $lines = explode("\n", str_replace("\r\n", "\n", $sql));
    $clean_lines = array();

    foreach ($lines as $line) {
        if (substr(trim($line), 0, 2) !== '--') {
            $clean_lines[] = $line;
        }
    }

    $sql = implode("\n", $clean_lines);
    $statements = array();
    $current = '';

    foreach (explode(";\n", $sql) as $chunk) {
        $current .= $chunk;

        if (substr(trim($chunk), -1) === ';') {
            $clean = trim($current);
            $clean = rtrim($clean, ';');

            if ($clean !== '') {
                $statements[] = $clean;
            }

            $current = '';
        }
    }

    $clean = trim($current);

    if ($clean !== '') {
        $statements[] = rtrim($clean, ';');
    }

    return $statements;
}

/*
 * Runs one SQL file against the connection.
 */
function run_sql_file($connection, $path, &$messages)
{
    $statements = read_sql_file($path);
    $done = 0;

    foreach ($statements as $statement) {
        if (mysqli_multi_query($connection, $statement)) {
            while (mysqli_more_results($connection) && mysqli_next_result($connection)) {
                mysqli_store_result($connection);
            }
        }

        if (mysqli_errno($connection) !== 0) {
            $messages[] = 'Error in ' . basename($path) . ': ' . mysqli_error($connection);
        }

        $done++;
    }

    $messages[] = basename($path) . ' ran ' . $done . ' statements.';
}

/*
 * Creates the database and loads everything.
 */
$connection = mysqli_connect($db_host, $db_user, $db_pass, '', $db_port);

if ($connection === false) {
    die('Could not connect to MySQL: ' . mysqli_connect_error());
}

mysqli_query($connection, 'CREATE DATABASE IF NOT EXISTS `' . $db_name . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
mysqli_select_db($connection, $db_name);

run_sql_file($connection, __DIR__ . '/schema.sql', $messages);
run_sql_file($connection, __DIR__ . '/seed.sql', $messages);

$result = mysqli_query($connection, 'SHOW TABLES');
$tables = $result !== false ? mysqli_fetch_all($result, MYSQLI_NUM) : array();

mysqli_close($connection);

echo '<h2>Alumini-Path database install</h2>';
echo '<p>Database: <strong>' . htmlspecialchars($db_name) . '</strong></p>';
echo '<ul>';

foreach ($messages as $message) {
    echo '<li>' . htmlspecialchars($message) . '</li>';
}

echo '</ul>';
echo '<p>Tables and views created: <strong>' . count($tables) . '</strong></p>';
echo '<p><a href="../index.php">Go to the API</a></p>';
