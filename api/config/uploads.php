<?php
/*
 * Alumini-Path :: file upload handling
 *
 * Uploads are checked on the server, stored with a random file name
 * outside the web root, and recorded in the `file_uploads` table.
 * Files are served back through api/files.php which checks who is
 * allowed to read them.
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';

/*
 * Returns the allowed file types and the size limit for each upload
 * purpose. The key is the upload context used in the file_uploads table.
 */
function upload_rules()
{
    return array(
        'profile_photo'       => array('types' => array('image/jpeg', 'image/png', 'image/webp'), 'max_mb' => 2),
        'job_document'        => array('types' => array('application/pdf', 'image/jpeg', 'image/png', 'image/webp'), 'max_mb' => 5),
        'event_poster'        => array('types' => array('image/jpeg', 'image/png', 'image/webp'), 'max_mb' => 4),
        'post_image'          => array('types' => array('image/jpeg', 'image/png', 'image/webp'), 'max_mb' => 4),
        'applicant_cv'        => array('types' => array('application/pdf'), 'max_mb' => 5),
        'supporting_document' => array('types' => array('application/pdf', 'image/jpeg', 'image/png', 'image/webp'), 'max_mb' => 5),
    );
}

/*
 * Returns the folder where uploaded files are kept.
 */
function upload_folder()
{
    $folder = getenv('UPLOAD_DIR');

    if ($folder === false || $folder === '') {
        $folder = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage';
    }

    return rtrim($folder, '/\\');
}

/*
 * Reads the real file type from the file contents, not from the browser.
 */
function detect_mime_type($path)
{
    $info = finfo_open(FILEINFO_MIME_TYPE);

    if ($info === false) {
        return 'application/octet-stream';
    }

    $mime = finfo_file($info, $path);
    finfo_close($info);

    if ($mime === false) {
        return 'application/octet-stream';
    }

    return $mime;
}

/*
 * Picks the file extension that matches the real mime type.
 */
function extension_for_mime($mime)
{
    if ($mime === 'image/jpeg') {
        return 'jpg';
    }
    if ($mime === 'image/png') {
        return 'png';
    }
    if ($mime === 'image/webp') {
        return 'webp';
    }
    if ($mime === 'application/pdf') {
        return 'pdf';
    }

    return 'bin';
}

/*
 * Explains a PHP upload error code in plain words.
 */
function upload_error_message($code)
{
    if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) {
        return 'The file is larger than the server allows.';
    }
    if ($code === UPLOAD_ERR_PARTIAL) {
        return 'The file was only partially uploaded.';
    }
    if ($code === UPLOAD_ERR_NO_FILE) {
        return 'No file was uploaded.';
    }
    if ($code === UPLOAD_ERR_NO_TMP_DIR) {
        return 'The server has no temporary folder.';
    }
    if ($code === UPLOAD_ERR_CANT_WRITE) {
        return 'The server could not write the file to disk.';
    }
    if ($code === UPLOAD_ERR_EXTENSION) {
        return 'A PHP extension blocked the upload.';
    }

    return 'The upload failed.';
}

/*
 * Checks and stores one uploaded file, then records it in the database.
 * Stops with a 422 JSON error if the file is invalid.
 *
 * Returns the new file_uploads row.
 */
function save_uploaded_file($file, $context, $uploader_id)
{
    $rules = upload_rules();

    if (!isset($rules[$context])) {
        reply_error('Unknown upload type: ' . $context, 422);
    }

    $allowed_types = $rules[$context]['types'];
    $max_mb = $rules[$context]['max_mb'];

    $error = isset($file['error']) ? (int) $file['error'] : UPLOAD_ERR_NO_FILE;

    if ($error !== UPLOAD_ERR_OK) {
        reply_error(upload_error_message($error), 422);
    }

    $size = isset($file['size']) ? (int) $file['size'] : 0;

    if ($size <= 0) {
        reply_error('The uploaded file is empty.', 422);
    }

    if ($size > $max_mb * 1024 * 1024) {
        reply_error('The file is larger than ' . $max_mb . 'MB.', 422);
    }

    $temporary_path = isset($file['tmp_name']) ? $file['tmp_name'] : '';

    if ($temporary_path === '' || !is_uploaded_file($temporary_path)) {
        reply_error('The upload could not be verified.', 422);
    }

    $mime = detect_mime_type($temporary_path);

    if (!in_array($mime, $allowed_types, true)) {
        reply_error('That file type is not allowed here. Allowed: ' . implode(', ', $allowed_types) . '.', 422);
    }

    $folder = upload_folder();

    if (!is_dir($folder)) {
        mkdir($folder, 0775, true);
    }

    $htaccess = $folder . DIRECTORY_SEPARATOR . '.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Order deny,allow\nDeny from all\n");
    }

    $stored_name = bin2hex(random_bytes(16)) . '.' . extension_for_mime($mime);
    $stored_path = $folder . DIRECTORY_SEPARATOR . $stored_name;

    if (!move_uploaded_file($temporary_path, $stored_path)) {
        reply_error('The file could not be stored on the server.', 422);
    }

    $checksum = hash_file('sha256', $stored_path);
    $original_name = substr(isset($file['name']) ? $file['name'] : $stored_name, 0, 255);

    $id = db_insert(
        'INSERT INTO `file_uploads`
            (`uploader_id`, `upload_context`, `original_name`, `stored_path`, `mime_type`, `size_bytes`, `checksum_sha256`)
         VALUES (?, ?, ?, ?, ?, ?, ?)',
        'issssis',
        array($uploader_id, $context, $original_name, $stored_path, $mime, $size, $checksum)
    );

    return db_one('SELECT * FROM `file_uploads` WHERE `id` = ?', 'i', array($id));
}

/*
 * Builds the small array that is safe to send to the browser.
 */
function file_summary($row)
{
    return array(
        'id'            => (int) $row['id'],
        'original_name' => $row['original_name'],
        'mime_type'     => $row['mime_type'],
        'size_bytes'    => (int) $row['size_bytes'],
        'download_url'  => 'api/files.php?id=' . (int) $row['id'],
    );
}
