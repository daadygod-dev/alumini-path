<?php
/*
 * Alumini-Path :: posts, comments and likes.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/validation.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/uploads.php';

/*
 * Lists the feed with the comment and like counts.
 */
function endpoint_posts()
{
    $user = require_login();

    $page = query_int('page', 1);
    $page_size = query_int('pageSize', 10);

    if ($page < 1) {
        $page = 1;
    }
    if ($page_size < 1 || $page_size > 50) {
        $page_size = 10;
    }

    $offset = ($page - 1) * $page_size;

    $posts = db_all(
        'SELECT p.*, u.`full_name` AS `author_name`, r.`code` AS `author_role`,
                ap.`current_role` AS `author_current_role`, ap.`current_company` AS `author_company`,
                ap.`avatar_file_id` AS `author_avatar_file_id`,
                (SELECT COUNT(*) FROM `post_comments` c WHERE c.`post_id` = p.`id`) AS `comment_count`,
                (SELECT COUNT(*) FROM `post_likes` l WHERE l.`post_id` = p.`id`) AS `like_count`,
                (SELECT COUNT(*) FROM `post_likes` l WHERE l.`post_id` = p.`id` AND l.`user_id` = ?) AS `liked_by_me`
           FROM `posts` p
           JOIN `users` u ON u.`id` = p.`author_id`
           JOIN `roles` r ON r.`id` = u.`role_id`
           LEFT JOIN `alumni_profiles` ap ON ap.`user_id` = p.`author_id`
          WHERE p.`status` = \'published\'
          ORDER BY p.`created_at` DESC
          LIMIT ? OFFSET ?',
        'iii',
        array($user['id'], $page_size, $offset)
    );

    foreach ($posts as $index => $post) {
        $img_id = isset($post['image_file_id']) ? (int) $post['image_file_id'] : 0;
        $av_id = isset($post['author_avatar_file_id']) ? (int) $post['author_avatar_file_id'] : 0;
        $posts[$index]['image_url'] = $img_id > 0 ? 'api/files.php?id=' . $img_id : '';
        $posts[$index]['author_avatar_url'] = $av_id > 0 ? 'api/files.php?id=' . $av_id : '';
    }

    reply_ok(array('posts' => $posts, 'page' => $page, 'pageSize' => $page_size));
}

/*
 * Publishes a post. An image can be attached in the same request.
 */
function endpoint_create_post()
{
    $user = require_permission('posts.create');
    $input = read_input();
    $errors = array();

    check_required($input, 'body', 'Post', $errors);
    check_text_length($input, 'body', 'Post', 4000, $errors);

    stop_if_errors($errors, 'Write something before publishing.');

    $image_file_id = null;

    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = save_uploaded_file($_FILES['image'], 'post_image', $user['id']);
        $image_file_id = $file['id'];
    }

    $post_id = db_insert(
        'INSERT INTO `posts` (`author_id`, `body`, `image_file_id`, `status`) VALUES (?, ?, ?, \'published\')',
        'isi',
        array($user['id'], input_value($input, 'body'), $image_file_id)
    );

    reply_ok(array('post_id' => $post_id), 'Post published.', 201);
}

/*
 * Adds a comment to a post.
 */
function endpoint_comment_on_post($post_id)
{
    $user = require_permission('posts.comment');
    $input = read_input();
    $errors = array();

    check_required($input, 'body', 'Comment', $errors);
    check_text_length($input, 'body', 'Comment', 1000, $errors);

    stop_if_errors($errors, 'Write something before commenting.');

    $post = db_one('SELECT `id` FROM `posts` WHERE `id` = ? AND `status` = \'published\' LIMIT 1', 'i', array($post_id));

    if ($post === null) {
        reply_error('That post was not found.', 404);
    }

    $comment_id = db_insert(
        'INSERT INTO `post_comments` (`post_id`, `author_id`, `body`) VALUES (?, ?, ?)',
        'iis',
        array($post_id, $user['id'], input_value($input, 'body'))
    );

    reply_ok(array('comment_id' => $comment_id), 'Comment added.', 201);
}

/*
 * Likes or unlikes a post.
 */
function endpoint_toggle_like($post_id)
{
    $user = require_permission('posts.like');

    $post = db_one('SELECT `id` FROM `posts` WHERE `id` = ? AND `status` = \'published\' LIMIT 1', 'i', array($post_id));

    if ($post === null) {
        reply_error('That post was not found.', 404);
    }

    $existing = db_one(
        'SELECT `post_id` FROM `post_likes` WHERE `post_id` = ? AND `user_id` = ? LIMIT 1',
        'ii',
        array($post_id, $user['id'])
    );

    if ($existing !== null) {
        db_query('DELETE FROM `post_likes` WHERE `post_id` = ? AND `user_id` = ?', 'ii', array($post_id, $user['id']));
        $liked = false;
    } else {
        db_query('INSERT INTO `post_likes` (`post_id`, `user_id`) VALUES (?, ?)', 'ii', array($post_id, $user['id']));
        $liked = true;
    }

    $count = (int) db_value('SELECT COUNT(*) FROM `post_likes` WHERE `post_id` = ?', 'i', array($post_id));

    reply_ok(array('liked' => $liked, 'like_count' => $count));
}

/*
 * Deletes a post. The author can delete their own, an administrator can
 * delete any.
 */
function endpoint_delete_post($post_id)
{
    $user = require_login();

    $post = db_one('SELECT * FROM `posts` WHERE `id` = ? LIMIT 1', 'i', array($post_id));

    if ($post === null) {
        reply_error('That post was not found.', 404);
    }

    $is_author = (int) $post['author_id'] === (int) $user['id'];
    $is_moderator = $user['role_code'] === 'administrator';

    if (!$is_author && !$is_moderator) {
        reply_error('You cannot delete this post.', 403);
    }

    db_query('UPDATE `posts` SET `status` = \'removed\' WHERE `id` = ?', 'i', array($post_id));

    if ($is_moderator && !$is_author) {
        audit_log_action($user['id'], 'post.moderated_removed', 'posts', $post_id, '');
    }

    reply_ok(null, 'Post removed.');
}

/*
 * Updates a post's content or moderation status.
 */
function endpoint_update_post($post_id)
{
    $user = require_login();

    $post = db_one('SELECT * FROM `posts` WHERE `id` = ? LIMIT 1', 'i', array($post_id));

    if ($post === null) {
        reply_error('That post was not found.', 404);
    }

    $is_author = (int) $post['author_id'] === (int) $user['id'];
    $is_moderator = role_can($user['role_code'], 'posts.moderate');

    if (!$is_author && !$is_moderator) {
        reply_error('You cannot edit this post.', 403);
    }

    $input = read_input();
    $errors = array();

    check_required($input, 'body', 'Post', $errors);
    check_text_length($input, 'body', 'Post', 4000, $errors);
    stop_if_errors($errors, 'Write something before saving.');

    $status = $post['status'];
    if ($is_moderator && array_key_exists('status', $input)) {
        $requested = input_value($input, 'status');
        if (in_array($requested, array('published', 'hidden', 'removed'), true)) {
            $status = $requested;
        }
    }

    db_query(
        'UPDATE `posts` SET `body` = ?, `status` = ? WHERE `id` = ?',
        'ssi',
        array(input_value($input, 'body'), $status, $post_id)
    );

    reply_ok(null, 'Post updated.');
}

/*
 * Lists the comments on a post.
 */
function endpoint_post_comments($post_id)
{
    require_login();

    $comments = db_all(
        'SELECT c.*, u.`full_name` AS `author_name` FROM `post_comments` c
           JOIN `users` u ON u.`id` = c.`author_id`
          WHERE c.`post_id` = ?
          ORDER BY c.`created_at` ASC',
        'i',
        array($post_id)
    );

    reply_ok(array('comments' => $comments));
}
