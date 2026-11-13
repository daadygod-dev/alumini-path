<?php
/*
 * Alumini-Path :: file download endpoint
 *
 * Files are stored outside direct web access, so they are served from
 * here after verifying session authentication and file context access.
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/auth.php';

send_cors_headers();

$file_id = query_int('id', 0);

if ($file_id < 1) {
    reply_error('No file was requested.', 400);
}

$user = require_login();

$file = db_one('SELECT * FROM `file_uploads` WHERE `id` = ? LIMIT 1', 'i', array($file_id));

if ($file === null) {
    reply_error('That file was not found.', 404);
}

$is_admin = $user['role_code'] === 'administrator' || $user['role_code'] === 'school_leader';
$is_owner = (int) $file['uploader_id'] === (int) $user['id'];
$context = $file['upload_context'];

$allowed = $is_admin || $is_owner;

if (!$allowed && $context === 'profile_photo') {
    $allowed = true;
}

if (!$allowed && $context === 'post_image') {
    $allowed = db_value(
        'SELECT 1 FROM `posts` WHERE `image_file_id` = ? AND `status` = \'published\' LIMIT 1',
        'i',
        array($file_id)
    ) !== null;
}

if (!$allowed && $context === 'event_poster') {
    $allowed = db_value(
        'SELECT 1 FROM `events` WHERE `poster_file_id` = ? AND `status` <> \'draft\' LIMIT 1',
        'i',
        array($file_id)
    ) !== null;
}

if (!$allowed && $context === 'job_document') {
    $allowed = db_value(
        'SELECT 1 FROM `job_documents` jd JOIN `jobs` j ON j.`id` = jd.`job_id`
          WHERE jd.`file_upload_id` = ? AND j.`status` <> \'draft\' LIMIT 1',
        'i',
        array($file_id)
    ) !== null;
}

if (!$allowed && ($context === 'applicant_cv' || $context === 'supporting_document')) {
    $allowed = db_value(
        'SELECT 1 FROM `job_applications` a JOIN `jobs` j ON j.`id` = a.`job_id`
          WHERE a.`cv_file_id` = ? AND j.`posted_by` = ? LIMIT 1',
        'ii',
        array($file_id, $user['id'])
    ) !== null;

    if (!$allowed) {
        $allowed = db_value(
            'SELECT 1 FROM `application_documents` ad
               JOIN `job_applications` a ON a.`id` = ad.`application_id`
               JOIN `jobs` j ON j.`id` = a.`job_id`
              WHERE ad.`file_upload_id` = ? AND j.`posted_by` = ? LIMIT 1',
            'ii',
            array($file_id, $user['id'])
        ) !== null;
    }
}

if (!$allowed) {
    reply_error('You cannot read that file.', 403);
}

if (!file_exists($file['stored_path'])) {
    reply_error('The file is missing from the server.', 404);
}

$name = str_replace(array("\r", "\n", '"'), '', $file['original_name']);

header('Content-Type: ' . $file['mime_type']);
header('Content-Length: ' . filesize($file['stored_path']));
header('Content-Disposition: inline; filename="' . $name . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=3600');

readfile($file['stored_path']);
exit;
