<?php
/*
 * Alumini-Path :: API front controller
 *
 * Every request comes in here. The path and the method decide which
 * function runs. Open this file in the browser with a path such as
 * api/index.php?route=jobs to test an endpoint.
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/validation.php';
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/config/uploads.php';

require_once __DIR__ . '/endpoints/auth.php';
require_once __DIR__ . '/endpoints/directory.php';
require_once __DIR__ . '/endpoints/jobs.php';
require_once __DIR__ . '/endpoints/mentorship.php';
require_once __DIR__ . '/endpoints/events.php';
require_once __DIR__ . '/endpoints/posts.php';
require_once __DIR__ . '/endpoints/analytics.php';

/*
 * Reads the route from the query string. Example: ?route=jobs&id=3
 */
function read_route()
{
    $route = query_value('route', '');

    if ($route === '') {
        return '';
    }

    return strtolower(trim($route));
}

/*
 * Reads the id from the query string.
 */
function read_id()
{
    return query_int('id', 0);
}

/*
 * Runs the requested endpoint.
 */
$route = read_route();
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$id = read_id();
$action = query_value('action', '');

if ($route === '') {
    reply_ok(array(
        'service' => 'Alumini-Path API',
        'version' => '1.0.0',
        'routes'  => array(
            'POST ?route=register',
            'POST ?route=signin',
            'POST ?route=signout',
            'GET  ?route=me',
            'GET  ?route=lookups',
            'POST ?route=forgot-password',
            'POST ?route=reset-password',
            'GET  ?route=directory',
            'GET  ?route=member&id=1',
            'POST ?route=member-create',
            'POST ?route=profile',
            'POST ?route=education',
            'POST ?route=employment',
            'POST ?route=connection&id=2',
            'GET  ?route=connections',
            'POST ?route=connections&action=respond',
            'GET  ?route=jobs',
            'GET  ?route=job&id=1',
            'POST ?route=job-create',
            'POST ?route=job-apply&id=1',
            'GET  ?route=job-applications&id=1',
            'POST ?route=application-status&id=1',
            'POST ?route=job-update&id=1',
            'DELETE ?route=job-delete&id=1',
            'GET  ?route=mentors',
            'POST ?route=become-mentor',
            'POST ?route=mentorship-request&id=2',
            'GET  ?route=mentorship',
            'POST ?route=mentorship&action=respond',
            'POST ?route=mentorship-session',
            'POST ?route=mentorship-session-complete&id=1',
            'GET  ?route=events',
            'GET  ?route=event&id=1',
            'POST ?route=event-create',
            'POST ?route=event-register&id=1',
            'POST ?route=event-cancel&id=1',
            'POST ?route=event-attendance&id=1&userId=2',
            'GET  ?route=posts',
            'POST ?route=post-create',
            'POST ?route=post-comment&id=1',
            'POST ?route=post-like&id=1',
            'DELETE ?route=post-delete&id=1',
            'GET  ?route=post-comments&id=1',
            'GET  ?route=analytics-summary',
            'GET  ?route=analytics-charts',
            'GET  ?route=analytics-export&report=alumni',
            'GET  ?route=activity-log',
        ),
    ));
}

if ($route === 'register' && $method === 'POST') {
    endpoint_register();
}

if ($route === 'signin' && $method === 'POST') {
    endpoint_sign_in();
}

if ($route === 'signout' && $method === 'POST') {
    endpoint_sign_out();
}

if ($route === 'me') {
    endpoint_me();
}

if ($route === 'lookups') {
    endpoint_lookups();
}

if ($route === 'forgot-password' && $method === 'POST') {
    endpoint_forgot_password();
}

if ($route === 'reset-password' && $method === 'POST') {
    endpoint_reset_password();
}

if ($route === 'change-password' && $method === 'POST') {
    endpoint_change_password();
}

if ($route === 'users') {
    endpoint_users();
}

if ($route === 'user-status' && $method === 'POST' && $id > 0) {
    endpoint_update_user_status($id);
}

if ($route === 'user-role' && $method === 'POST' && $id > 0) {
    endpoint_update_user_role($id);
}

if ($route === 'directory') {
    endpoint_directory();
}

if ($route === 'member' && $id > 0) {
    endpoint_member_profile($id);
}

if ($route === 'member-create' && $method === 'POST') {
    endpoint_create_member();
}

if ($route === 'profile' && $method === 'POST') {
    endpoint_update_profile();
}

if ($route === 'education' && $method === 'POST') {
    endpoint_update_education();
}

if ($route === 'employment' && $method === 'POST') {
    endpoint_update_employment();
}

if ($route === 'connection' && $method === 'POST' && $id > 0) {
    endpoint_send_connection($id);
}

if ($route === 'connections') {
    endpoint_connections($action);
}

if ($route === 'jobs') {
    endpoint_jobs();
}

if ($route === 'job' && $id > 0) {
    endpoint_job($id);
}

if ($route === 'job-create' && $method === 'POST') {
    endpoint_create_job();
}

if ($route === 'job-apply' && $method === 'POST' && $id > 0) {
    endpoint_apply_to_job($id);
}

if ($route === 'job-applications' && $id > 0) {
    endpoint_job_applications($id);
}

if ($route === 'application-status' && $method === 'POST' && $id > 0) {
    endpoint_update_application_status($id);
}

if ($route === 'job-update' && $method === 'POST' && $id > 0) {
    endpoint_update_job($id);
}

if ($route === 'job-delete' && $method === 'DELETE' && $id > 0) {
    endpoint_delete_job($id);
}

if ($route === 'mentors') {
    endpoint_mentors();
}

if ($route === 'become-mentor' && $method === 'POST') {
    endpoint_become_mentor();
}

if ($route === 'mentorship-request' && $method === 'POST' && $id > 0) {
    endpoint_request_mentorship($id);
}

if ($route === 'mentorship') {
    endpoint_mentorship_requests($action);
}

if ($route === 'mentorship-session' && $method === 'POST') {
    endpoint_create_mentorship_session();
}

if ($route === 'mentorship-session-complete' && $method === 'POST' && $id > 0) {
    endpoint_complete_mentorship_session($id);
}

if ($route === 'events') {
    endpoint_events();
}

if ($route === 'event' && $id > 0) {
    endpoint_event($id);
}

if ($route === 'event-create' && $method === 'POST') {
    endpoint_create_event();
}

if ($route === 'event-update' && $method === 'POST' && $id > 0) {
    endpoint_update_event($id);
}

if ($route === 'event-delete' && $method === 'DELETE' && $id > 0) {
    endpoint_delete_event($id);
}

if ($route === 'event-register' && $method === 'POST' && $id > 0) {
    endpoint_register_for_event($id);
}

if ($route === 'event-cancel' && $method === 'POST' && $id > 0) {
    endpoint_cancel_event_registration($id);
}

if ($route === 'event-attendance' && $method === 'POST' && $id > 0) {
    endpoint_mark_attendance($id, query_int('userId', 0));
}

if ($route === 'posts') {
    endpoint_posts();
}

if ($route === 'post-create' && $method === 'POST') {
    endpoint_create_post();
}

if ($route === 'post-update' && $method === 'POST' && $id > 0) {
    endpoint_update_post($id);
}

if ($route === 'post-comment' && $method === 'POST' && $id > 0) {
    endpoint_comment_on_post($id);
}

if ($route === 'post-like' && $method === 'POST' && $id > 0) {
    endpoint_toggle_like($id);
}

if ($route === 'post-delete' && $method === 'DELETE' && $id > 0) {
    endpoint_delete_post($id);
}

if ($route === 'post-comments' && $id > 0) {
    endpoint_post_comments($id);
}

if ($route === 'analytics-summary') {
    endpoint_analytics_summary();
}

if ($route === 'analytics-charts') {
    endpoint_analytics_charts();
}

if ($route === 'analytics-export') {
    endpoint_analytics_export();
}

if ($route === 'activity-log') {
    endpoint_activity_log();
}

if ($route === 'notifications') {
    endpoint_notifications();
}

if ($route === 'notifications-read' && $method === 'POST') {
    endpoint_mark_notifications_read();
}

reply_error('Unknown route: ' . $route, 404);
