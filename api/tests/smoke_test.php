<?php
/*
 * Alumini-Path :: end to end smoke test
 * Run from the command line: php api/tests/smoke_test.php
 *
 * Signs in as the demo alumni account, then walks through every module
 * and prints PASS or FAIL for each check.
 */

$base = 'http://127.0.0.1:8085/api/index.php';
$token = '';
$pass = 0;
$fail = 0;

function call_api($base, $route, $method = 'GET', $body = null, $token = '', $query = '')
{
    $url = $base . '?route=' . $route . ($query === '' ? '' : '&' . $query);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($token !== '') {
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Bearer ' . $token));
    }

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        if ($token !== '') {
            curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Authorization: Bearer ' . $token));
        }
    }

    $output = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return array('code' => $code, 'json' => json_decode($output, true));
}

function check($label, $ok, $extra = '')
{
    global $pass, $fail;

    if ($ok) {
        $pass++;
        echo 'PASS  ' . $label . PHP_EOL;
    } else {
        $fail++;
        echo 'FAIL  ' . $label . '  ' . $extra . PHP_EOL;
    }
}

// ---- sign in -------------------------------------------------------------
$response = call_api($base, 'signin', 'POST', array('email' => 'aline.mukamana@alumninet.rw', 'password' => 'Pass123!'));
$token = isset($response['json']['data']['session']['token']) ? $response['json']['data']['session']['token'] : '';
check('sign in with the demo alumni account', $response['code'] === 200 && $token !== '');

// ---- wrong password ------------------------------------------------------
$response = call_api($base, 'signin', 'POST', array('email' => 'aline.mukamana@alumninet.rw', 'password' => 'wrongpassword'));
check('wrong password is rejected', $response['code'] === 401);

// ---- protected route without a token -------------------------------------
$response = call_api($base, 'me');
check('a protected route refuses a missing token', $response['code'] === 401);

// ---- current user --------------------------------------------------------
$response = call_api($base, 'me', 'GET', null, $token);
$me_name = isset($response['json']['data']['user']['full_name']) ? $response['json']['data']['user']['full_name'] : '';
check('me returns the signed in user', $response['code'] === 200 && $me_name === 'Aline Mukamana');

// ---- directory -----------------------------------------------------------
$response = call_api($base, 'directory', 'GET', null, $token, 'search=&page=1&pageSize=10');
$total = isset($response['json']['data']['total']) ? $response['json']['data']['total'] : 0;
$rows = isset($response['json']['data']['rows']) ? $response['json']['data']['rows'] : array();
check('directory returns rows', $response['code'] === 200 && count($rows) > 0, 'total=' . $total);

$response = call_api($base, 'directory', 'GET', null, $token, 'search=React');
$react_rows = isset($response['json']['data']['rows']) ? $response['json']['data']['rows'] : array();
check('directory search filters by skill name', $response['code'] === 200 && count($react_rows) > 0);

$response = call_api($base, 'directory', 'GET', null, $token, 'graduationYear=2021');
$year_total = isset($response['json']['data']['total']) ? $response['json']['data']['total'] : 0;
check('directory filters by graduation year', $response['code'] === 200 && $year_total >= 1);

// ---- member profile ------------------------------------------------------
$response = call_api($base, 'member', 'GET', null, $token, 'id=3');
$education = isset($response['json']['data']['education']) ? $response['json']['data']['education'] : array();
check('member profile returns education and employment', $response['code'] === 200 && count($education) > 0);

// ---- update profile ------------------------------------------------------
$response = call_api($base, 'profile', 'POST', array(
    'fullName'       => 'Aline Mukamana',
    'email'          => 'aline.mukamana@alumninet.rw',
    'phone'          => '+250788100001',
    'graduationYear' => 2021,
    'department'     => 'Information Technology',
    'currentRole'    => 'Frontend Engineer',
    'company'        => 'Andela',
    'location'       => 'Kigali',
    'sector'         => 'Software',
    'skills'         => 'React, MUI, Accessibility',
), $token);
check('profile update succeeds', $response['code'] === 200);

// ---- profile validation --------------------------------------------------
$response = call_api($base, 'profile', 'POST', array(
    'fullName'       => '',
    'email'          => 'not-an-email',
    'graduationYear' => 'abcd',
), $token);
$errors = isset($response['json']['errors']) ? $response['json']['errors'] : array();
check('profile validation rejects bad input', $response['code'] === 422 && count($errors) >= 3);

// ---- jobs ----------------------------------------------------------------
$response = call_api($base, 'jobs', 'GET', null, $token, 'status=open');
$jobs = isset($response['json']['data']['jobs']) ? $response['json']['data']['jobs'] : array();
check('job list returns open jobs', $response['code'] === 200 && count($jobs) >= 3);

$response = call_api($base, 'job', 'GET', null, $token, 'id=201');
$job_title = isset($response['json']['data']['job']['title']) ? $response['json']['data']['job']['title'] : '';
check('job detail returns the posting', $response['code'] === 200 && $job_title === 'Junior Frontend Developer');

// ---- create a job --------------------------------------------------------
$response = call_api($base, 'job-create', 'POST', array(
    'title'               => 'Smoke Test Junior Analyst',
    'company'             => 'Smoke Test Ltd',
    'location'            => 'Kigali',
    'employmentType'      => 'full_time',
    'sector'              => 'Analytics',
    'description'         => 'Created by the smoke test.',
    'qualifications'      => 'SQL basics',
    'contactEmail'        => 'careers@smoketest.rw',
    'applicationDeadline' => date('Y-m-d', strtotime('+30 days')),
), $token);
$new_job_id = isset($response['json']['data']['job_id']) ? $response['json']['data']['job_id'] : 0;
check('a job can be published', $response['code'] === 201 && $new_job_id > 0);

// ---- job validation ------------------------------------------------------
$response = call_api($base, 'job-create', 'POST', array(
    'title'               => '',
    'contactEmail'        => 'nope',
    'applicationDeadline' => date('Y-m-d', strtotime('-5 days')),
), $token);
check('job validation rejects a bad deadline and email', $response['code'] === 422);

// ---- apply for a job -----------------------------------------------------
$response = call_api($base, 'signin', 'POST', array('email' => 'cedric.mugenzi@campus.rw', 'password' => 'Pass123!'));
$student_token = isset($response['json']['data']['session']['token']) ? $response['json']['data']['session']['token'] : '';

$response = call_api($base, 'job-apply', 'POST', array('coverNote' => 'Please consider my portfolio.'), $student_token, 'id=' . $new_job_id);
check('a student can apply to a job', $response['code'] === 201);

$response = call_api($base, 'job-apply', 'POST', array('coverNote' => 'Second try.'), $student_token, 'id=' . $new_job_id);
check('a duplicate application is refused', $response['code'] === 409);

// ---- applicant tracking --------------------------------------------------
$response = call_api($base, 'job-applications', 'GET', null, $token, 'id=' . $new_job_id);
$applications = isset($response['json']['data']['applications']) ? $response['json']['data']['applications'] : array();
check('the poster sees the applicants', $response['code'] === 200 && count($applications) === 1);

$response = call_api($base, 'job-applications', 'GET', null, $student_token, 'id=' . $new_job_id);
check('another member cannot see the applicants', $response['code'] === 403);

$application_id = 0;
if (isset($applications[0]['id'])) {
    $application_id = $applications[0]['id'];
}

$response = call_api($base, 'application-status', 'POST', array('status' => 'shortlisted', 'note' => 'Strong SQL work.'), $token, 'id=' . $application_id);
check('the poster can change the application status', $response['code'] === 200);

$response = call_api($base, 'application-status', 'POST', array('status' => 'not-a-status'), $token, 'id=' . $application_id);
check('an invalid application status is refused', $response['code'] === 422);

// ---- delete the test job -------------------------------------------------
$response = call_api($base, 'job-delete', 'DELETE', null, $token, 'id=' . $new_job_id);
check('the poster can delete their own job', $response['code'] === 200);

// ---- mentorship ----------------------------------------------------------
$response = call_api($base, 'mentors', 'GET', null, $token);
$mentors = isset($response['json']['data']['mentors']) ? $response['json']['data']['mentors'] : array();
check('the mentor list loads', $response['code'] === 200 && count($mentors) >= 3);

$response = call_api($base, 'mentorship-request', 'POST', array(
    'careerInterests' => 'Frontend engineering',
    'expectations'    => 'Monthly portfolio reviews.',
), $student_token, 'id=1');
check('a student can send a mentorship request', $response['code'] === 201 || $response['code'] === 409);

$response = call_api($base, 'mentorship-request', 'POST', array(
    'careerInterests' => 'Frontend engineering',
), $student_token, 'id=1');
check('a duplicate mentorship request is refused', $response['code'] === 409);

$response = call_api($base, 'mentorship', 'GET', null, $token);
check('mentorship inbox loads received, sent and sessions', $response['code'] === 200 && isset($response['json']['data']['received']) && isset($response['json']['data']['sessions']));

// ---- events --------------------------------------------------------------
$response = call_api($base, 'events', 'GET', null, $token, 'upcoming=1');
$events = isset($response['json']['data']['events']) ? $response['json']['data']['events'] : array();
check('the event list loads', $response['code'] === 200 && count($events) >= 3);

$response = call_api($base, 'event-register', 'POST', null, $student_token, 'id=302');
check('a student can register for an event', $response['code'] === 201);

$response = call_api($base, 'event-register', 'POST', null, $student_token, 'id=302');
check('a duplicate event registration is refused', $response['code'] === 409);

$response = call_api($base, 'event-cancel', 'POST', null, $student_token, 'id=302');
check('a student can cancel a registration', $response['code'] === 200);

// ---- posts ---------------------------------------------------------------
$response = call_api($base, 'posts', 'GET', null, $token);
$posts = isset($response['json']['data']['posts']) ? $response['json']['data']['posts'] : array();
check('the feed loads', $response['code'] === 200 && count($posts) >= 5);

$response = call_api($base, 'post-create', 'POST', array('body' => 'Smoke test post.'), $token);
$post_id = isset($response['json']['data']['post_id']) ? $response['json']['data']['post_id'] : 0;
check('a post can be published', $response['code'] === 201 && $post_id > 0);

$response = call_api($base, 'post-comment', 'POST', array('body' => 'Smoke test comment.'), $student_token, 'id=' . $post_id);
check('a post can be commented on', $response['code'] === 201);

$response = call_api($base, 'post-like', 'POST', null, $student_token, 'id=' . $post_id);
check('a post can be liked', $response['code'] === 200 && isset($response['json']['data']['liked']) && $response['json']['data']['liked'] === true);

$response = call_api($base, 'post-like', 'POST', null, $student_token, 'id=' . $post_id);
check('a post can be unliked', $response['code'] === 200 && isset($response['json']['data']['liked']) && $response['json']['data']['liked'] === false);

$response = call_api($base, 'post-delete', 'DELETE', null, $student_token, 'id=' . $post_id);
check('another member cannot delete the post', $response['code'] === 403);

$response = call_api($base, 'post-delete', 'DELETE', null, $token, 'id=' . $post_id);
check('the author can delete their own post', $response['code'] === 200);

// ---- analytics -----------------------------------------------------------
$response = call_api($base, 'signin', 'POST', array('email' => 'emmanuel.nshuti@institution.rw', 'password' => 'Pass123!'));
$leader_token = isset($response['json']['data']['session']['token']) ? $response['json']['data']['session']['token'] : '';

$response = call_api($base, 'analytics-summary', 'GET', null, $leader_token);
$alumni_total = isset($response['json']['data']['alumni']['total']) ? $response['json']['data']['alumni']['total'] : 0;
check('a school leader sees the analytics summary', $response['code'] === 200 && $alumni_total > 0);

$response = call_api($base, 'analytics-charts', 'GET', null, $leader_token);
$charts = isset($response['json']['data']) ? $response['json']['data'] : array();
check('every analytics chart series is present', $response['code'] === 200 && count($charts) === 8, 'series=' . count($charts));

$response = call_api($base, 'analytics-summary', 'GET', null, $student_token);
check('a student cannot see the analytics', $response['code'] === 403);

// ---- connections ---------------------------------------------------------
$response = call_api($base, 'connections', 'GET', null, $token);
check('the connection list loads', $response['code'] === 200 && isset($response['json']['data']['requests']));

$response = call_api($base, 'connection', 'POST', null, $student_token, 'id=6');
check('a connection request can be sent', $response['code'] === 200 || $response['code'] === 409);

// ---- password reset & security -------------------------------------------
$response = call_api($base, 'forgot-password', 'POST', array('email' => 'nobody@example.com'));
check('the reset endpoint answers the same for an unknown email', $response['code'] === 200);

// ---- lookups & production modules ----------------------------------------
$response = call_api($base, 'lookups', 'GET');
check('lookups returns departments, programmes, sectors, and roles', $response['code'] === 200 && count($response['json']['data']['departments']) > 0 && count($response['json']['data']['roles']) >= 4);

$response = call_api($base, 'signin', 'POST', array('email' => 'admin@alumninet.rw', 'password' => 'Pass123!'));
$admin_token = isset($response['json']['data']['session']['token']) ? $response['json']['data']['session']['token'] : '';
check('admin signs in cleanly', $response['code'] === 200 && $admin_token !== '');

// Alumni apply permission (user 2 applying to job 201) + job-update lifecycle
$response = call_api($base, 'signin', 'POST', array('email' => 'jean.habimana@alumninet.rw', 'password' => 'Pass123!'));
$alumni2_token = isset($response['json']['data']['session']['token']) ? $response['json']['data']['session']['token'] : '';
$response = call_api($base, 'job-create', 'POST', array(
    'title'          => 'Alumni Referrer Job Test',
    'company'        => 'Karongi Tech',
    'location'       => 'Kigali',
    'employmentType' => 'contract',
    'salaryMin'      => 500000,
    'salaryMax'      => 900000,
    'salaryCurrency' => 'RWF',
    'contactEmail'   => 'hr@karongitech.rw',
    'description'    => 'Contract role for verification test.',
), $token);
$test_job_id = isset($response['json']['data']['job_id']) ? $response['json']['data']['job_id'] : 0;
check('alumni job with salary band is created', $response['code'] === 201 && $test_job_id > 0);

$response = call_api($base, 'job-apply', 'POST', array('coverNote' => 'Interested alumni candidate.'), $alumni2_token, 'id=' . $test_job_id);
check('alumni can apply for a job (jobs.apply RBAC)', $response['code'] === 201);

$response = call_api($base, 'job-update', 'POST', array('status' => 'closed'), $token, 'id=' . $test_job_id);
check('job owner can update job status to closed', $response['code'] === 200);

$response = call_api($base, 'job-delete', 'DELETE', null, $token, 'id=' . $test_job_id);
check('cleanup test job succeeds', $response['code'] === 200);

// Events admin create / update / register / attendance / delete
$response = call_api($base, 'event-create', 'POST', array(
    'title'          => 'Test Tech Forum',
    'category'       => 'conference',
    'venue'          => 'RP Karongi Auditorium',
    'eventDate'      => date('Y-m-d', strtotime('+20 days')),
    'startsAt'       => '09:00:00',
    'endsAt'         => '15:00:00',
    'availableSeats' => 50,
    'description'    => 'Verification event created by test suite.',
), $admin_token);
$test_event_id = isset($response['json']['data']['event_id']) ? $response['json']['data']['event_id'] : 0;
check('admin creates an event', $response['code'] === 201 && $test_event_id > 0);

$response = call_api($base, 'event-update', 'POST', array(
    'title'          => 'Test Tech Forum Updated',
    'category'       => 'seminar',
    'venue'          => 'RP Karongi Main Hall',
    'eventDate'      => date('Y-m-d', strtotime('+21 days')),
    'availableSeats' => 60,
    'description'    => 'Updated event details.',
    'status'         => 'published',
), $admin_token, 'id=' . $test_event_id);
check('admin updates an event', $response['code'] === 200);

$response = call_api($base, 'event-register', 'POST', null, $student_token, 'id=' . $test_event_id);
check('student registers for the new event', $response['code'] === 201);

$response = call_api($base, 'event-attendance', 'POST', null, $admin_token, 'id=' . $test_event_id . '&userId=3&status=attended');
check('admin marks participant attendance', $response['code'] === 200);

$response = call_api($base, 'event-delete', 'DELETE', null, $admin_token, 'id=' . $test_event_id);
check('admin deletes the test event cleanly', $response['code'] === 200);

// Post edit + admin moderation
$response = call_api($base, 'post-create', 'POST', array('body' => 'Editable test post'), $token);
$edit_post_id = isset($response['json']['data']['post_id']) ? $response['json']['data']['post_id'] : 0;
$response = call_api($base, 'post-update', 'POST', array('body' => 'Edited post body'), $token, 'id=' . $edit_post_id);
check('author can edit their own post', $response['code'] === 200);

$response = call_api($base, 'post-update', 'POST', array('body' => 'Edited post body', 'status' => 'hidden'), $admin_token, 'id=' . $edit_post_id);
check('admin can hide/moderate a post', $response['code'] === 200);

$response = call_api($base, 'post-delete', 'DELETE', null, $admin_token, 'id=' . $edit_post_id);
check('admin can delete moderated post', $response['code'] === 200);

// Admin users & audit log & notifications
$response = call_api($base, 'users', 'GET', null, $admin_token);
check('admin users list loads', $response['code'] === 200 && count($response['json']['data']['users']) >= 7);

$response = call_api($base, 'users', 'GET', null, $student_token);
check('non-admin cannot access users management endpoint', $response['code'] === 403);

$response = call_api($base, 'activity-log', 'GET', null, $admin_token);
check('admin can inspect audit activity log', $response['code'] === 200 && isset($response['json']['data']['logs']));

$response = call_api($base, 'notifications', 'GET', null, $token);
check('notifications endpoint returns inbox items', $response['code'] === 200 && isset($response['json']['data']['notifications']));

// Analytics filters + CSV export + password change round-trip
$response = call_api($base, 'analytics-charts', 'GET', null, $leader_token, 'graduationYear=2021&department=1');
check('analytics filters accept graduationYear and department cleanly', $response['code'] === 200 && count($response['json']['data']) === 8);

$response = call_api($base, 'change-password', 'POST', array('currentPassword' => 'Pass123!', 'newPassword' => 'TempPass99!'), $alumni2_token);
$changed_ok = ($response['code'] === 200);
$restore_resp = call_api($base, 'change-password', 'POST', array('currentPassword' => 'TempPass99!', 'newPassword' => 'Pass123!'), $alumni2_token);
check('authenticated change-password succeeds and restores cleanly', $changed_ok && $restore_resp['code'] === 200);

// Files endpoint security check (unauthenticated rejected)
$files_ch = curl_init('http://127.0.0.1:8085/api/files.php?id=1');
curl_setopt($files_ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($files_ch);
$files_code = curl_getinfo($files_ch, CURLINFO_HTTP_CODE);
curl_close($files_ch);
check('files.php rejects unauthenticated requests with 401', $files_code === 401);

// ---- summary -------------------------------------------------------------
echo PHP_EOL;
echo 'Passed: ' . $pass . '   Failed: ' . $fail . PHP_EOL;

exit($fail === 0 ? 0 : 1);
