-- ============================================================================
--  Alumini-Path :: Alumni Networking & Job Referral System
--  File    : 02_seed.sql
--  Target  : MySQL 8.0 / MariaDB 10.4+ (XAMPP)
--  Command : mysql -u root < api/database/02_seed.sql
--
--  Seeds the reference data the directory filters depend on, the role /
--  permission matrix, demo accounts matching the React mock data, and
--  realistic rows for jobs, mentorship, events, posts and applications.
--
--  Demo password for every account: Pass123!
-- ============================================================================

USE alumni_network;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `post_likes`;
TRUNCATE TABLE `post_comments`;
TRUNCATE TABLE `posts`;
TRUNCATE TABLE `event_registrations`;
TRUNCATE TABLE `events`;
TRUNCATE TABLE `mentorship_sessions`;
TRUNCATE TABLE `mentorship_requests`;
TRUNCATE TABLE `mentor_profiles`;
TRUNCATE TABLE `application_status_history`;
TRUNCATE TABLE `application_documents`;
TRUNCATE TABLE `job_applications`;
TRUNCATE TABLE `job_documents`;
TRUNCATE TABLE `jobs`;
TRUNCATE TABLE `connections`;
TRUNCATE TABLE `employment_records`;
TRUNCATE TABLE `education_records`;
TRUNCATE TABLE `user_skills`;
TRUNCATE TABLE `alumni_profiles`;
TRUNCATE TABLE `file_uploads`;
TRUNCATE TABLE `password_resets`;
TRUNCATE TABLE `user_sessions`;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `audit_log`;
TRUNCATE TABLE `platform_settings`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `role_permissions`;
TRUNCATE TABLE `roles`;
TRUNCATE TABLE `skills`;
TRUNCATE TABLE `sectors`;
TRUNCATE TABLE `programmes`;
TRUNCATE TABLE `departments`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `code`, `label`, `description`) VALUES
  (1, 'administrator', 'Administrator', 'Manages alumni accounts, events, job postings, moderation and reports.'),
  (2, 'alumni',         'Alumni',         'Former student: profile, networking, referrals, mentorship, applications.'),
  (3, 'student',        'Student',        'Current student: profile, directory, applications, mentorship requests.'),
  (4, 'employee',       'Employee',       'Staff member: manages the directory and publishes opportunities.'),
  (5, 'school_leader',  'School Leader',  'Leadership: analytics, reporting, oversight of engagement.');

-- ---------------------------------------------------------------------------
-- PERMISSION MATRIX
-- ---------------------------------------------------------------------------
INSERT INTO `role_permissions` (`role_id`, `permission_code`) VALUES
  -- administrator
  (1,'profile.view'),    (1,'profile.edit'),   (1,'directory.manage'), (1,'directory.view'),
  (1,'jobs.manage'),     (1,'jobs.view'),       (1,'jobs.publish'),
  (1,'mentorship.manage'),(1,'mentorship.view'),(1,'mentorship.request'),(1,'mentorship.accept'),
  (1,'events.manage'),   (1,'events.view'),     (1,'events.register'),
  (1,'posts.moderate'),  (1,'posts.view'),      (1,'posts.create'),      (1,'posts.edit_own'),
  (1,'analytics.view'),  (1,'reports.export'),  (1,'users.manage'),
  -- alumni
  (2,'profile.view'),    (2,'profile.edit'),    (2,'directory.view'),    (2,'connections.manage'),
  (2,'jobs.view'),       (2,'jobs.publish'),    (2,'jobs.manage_own'),   (2,'jobs.apply'),
  (2,'mentorship.view'), (2,'mentorship.request'),(2,'mentorship.accept'),(2,'mentorship.manage_own'),
  (2,'events.view'),     (2,'events.register'), (2,'posts.view'),        (2,'posts.create'),
  (2,'posts.edit_own'),  (2,'posts.comment'),   (2,'posts.like'),
  -- student
  (3,'profile.view'),    (3,'profile.edit'),    (3,'directory.view'),    (3,'connections.manage'),
  (3,'jobs.view'),       (3,'jobs.apply'),      (3,'mentorship.view'),   (3,'mentorship.request'),
  (3,'events.view'),     (3,'events.register'), (3,'posts.view'),        (3,'posts.create'),
  (3,'posts.edit_own'),  (3,'posts.comment'),   (3,'posts.like'),
  -- employee
  (4,'profile.view'),    (4,'profile.edit'),    (4,'directory.manage'),  (4,'directory.view'),
  (4,'jobs.view'),       (4,'jobs.publish'),    (4,'jobs.manage_own'),   (4,'events.view'),
  (4,'events.register'), (4,'posts.view'),      (4,'posts.create'),      (4,'posts.edit_own'),
  (4,'posts.comment'),   (4,'posts.like'),      (4,'mentorship.view'),
  -- school leader
  (5,'profile.view'),    (5,'directory.view'),  (5,'analytics.view'),    (5,'reports.export'),
  (5,'events.view'),     (5,'events.register'), (5,'posts.view'),        (5,'mentorship.view'),
  (5,'jobs.view');

-- ---------------------------------------------------------------------------
-- LOOKUP DATA
-- ---------------------------------------------------------------------------
INSERT INTO `departments` (`id`, `code`, `name`) VALUES
  (1, 'ICT',  'Information Technology'),
  (2, 'CS',   'Computer Science'),
  (3, 'BIS',  'Business Information Systems'),
  (4, 'NET',  'Networking');

INSERT INTO `programmes` (`id`, `department_id`, `code`, `name`) VALUES
  (1, 1, 'ICT-BSC',  'BSc Information Technology'),
  (2, 1, 'ICT-DIP',  'TVET Certificate VI in Information Technology'),
  (3, 2, 'CS-BSC',   'BSc Computer Science'),
  (4, 2, 'CS-MSC',   'MSc Computer Science'),
  (5, 3, 'BIS-BSC',  'BSc Business Information Systems'),
  (6, 4, 'NET-DIP',  'TVET Certificate VI in Networking');

INSERT INTO `sectors` (`id`, `code`, `name`) VALUES
  (1, 'SOFT',   'Software'),
  (2, 'ANALY',  'Analytics'),
  (3, 'OPS',    'Operations'),
  (4, 'EDU',    'Education'),
  (5, 'FIN',    'Finance'),
  (6, 'STUDEV', 'Student Development');

INSERT INTO `skills` (`id`, `name`) VALUES
  (1,'React'), (2,'MUI'), (3,'UI Architecture'), (4,'Python'), (5,'Power BI'),
  (6,'SQL'), (7,'UI Testing'), (8,'Career Research'), (9,'Data Visualization'),
  (10,'Product Ops'), (11,'Mentoring'), (12,'Stakeholder Management'),
  (13,'Academic Strategy'), (14,'Partnership Development'), (15,'Leadership'),
  (16,'Node.js'), (17,'DevOps'), (18,'Cybersecurity'), (19,'PHP'), (20,'MySQL');

-- ---------------------------------------------------------------------------
-- USERS  (password_hash is bcrypt of "Pass123!")
-- ---------------------------------------------------------------------------
INSERT INTO `users` (`id`, `role_id`, `full_name`, `email`, `phone`, `password_hash`, `status`, `last_login_at`) VALUES
  (1, 2, 'Aline Mukamana',      'aline.mukamana@alumninet.rw',   '+250788100001', '$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW()),
  (2, 2, 'Jean Claude Habimana','jean.habimana@alumninet.rw',   '+250788100002', '$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW()),
  (3, 3, 'Cedric Mugenzi',      'cedric.mugenzi@campus.rw',     '+250788100003', '$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW()),
  (4, 3, 'Sandrine Uwineza',    'sandrine.uwineza@campus.rw',   '+250788100004', '$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW()),
  (5, 4, 'Diane Uwase',         'diane.uwase@institution.rw',  '+250788100005', '$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW()),
  (6, 5, 'Dr Emmanuel Nshuti',  'emmanuel.nshuti@institution.rw','+250788100006','$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW()),
  (7, 1, 'Console Administrator','admin@alumninet.rw',           '+250788100007', '$2y$10$PkorUEVCQJdA37rwlGE1Aex4kNybFGY26G6uzkA34chn4tDT1tyEG', 'active', NOW());

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
INSERT INTO `alumni_profiles`
  (`user_id`,`reg_no`,`graduation_year`,`department_id`,`programme_id`,`sector_id`,`current_role`,`current_company`,`location`,`bio`,`years_experience`,`mentorship_available`) VALUES
  (1,'25rp04197',2021,1,1,1,'Frontend Engineer','Andela','Kigali','Focuses on accessible interfaces and mentoring junior developers.',6,1),
  (2,'24rp01880',2020,2,3,2,'Data Analyst','BK Tech House','Kigali','Builds reporting pipelines for higher-education insights.',5,1),
  (3,'25rp05214',2027,1,2,6,'Final-year student','Main campus','Kigali','Preparing for graduate internships and wants alumni feedback on portfolio projects.',1,0),
  (4,'25rp05215',2026,2,3,6,'Student researcher','Innovation lab','Huye','Wants to connect with alumni working in analytics and digital transformation.',1,0),
  (5,'22rp00915',2024,3,5,3,'Career Services Officer','Career development office','Kigali','Coordinates campus employability programs and keeps referral pipelines moving.',4,1),
  (6,'18rp00211',2023,2,4,4,'Dean of Student Success','School leadership office','Kigali','Monitors student outcomes, alumni engagement, and employer partnerships.',14,1),
  (7,'00rp00001',2010,3,5,3,'Platform Administrator','Alumni Network Office','Kigali','Manages accounts, events, moderation and institutional reporting.',12,0);

INSERT INTO `user_skills` (`user_id`,`skill_id`) VALUES
  (1,1),(1,2),(1,3),(1,9),
  (2,4),(2,5),(2,6),(2,9),
  (3,1),(3,7),(3,8),
  (4,4),(4,6),(4,9),
  (5,10),(5,11),(5,12),
  (6,13),(6,14),(6,15),
  (7,19),(7,20);

INSERT INTO `education_records` (`user_id`,`qualification`,`institution`,`programme_id`,`start_year`,`end_year`,`grade`,`description`,`sort_order`) VALUES
  (1,'BSc Information Technology','RP Karongi College',1,2016,2021,'Distinction','Graduated from the ICT department.',1),
  (1,'Google UX Certificate','Google',NULL,2022,2022,'Pass','User experience fundamentals.',2),
  (2,'BSc Computer Science','RP Karongi College',3,2015,2020,'First Class','Graduated from the Computer Science department.',1),
  (3,'BSc Information Technology (ongoing)','RP Karongi College',2,2024,NULL,NULL,'Currently enrolled in Level 6 IT.',1),
  (4,'BSc Computer Science (ongoing)','RP Karongi College',3,2023,NULL,NULL,'Currently enrolled in Computer Science.',1),
  (5,'BSc Business Information Systems','RP Karongi College',5,2018,2022,'Pass','Business systems and analytics.',1),
  (5,'Agile Delivery Workshop','Andela',NULL,2023,2023,'Pass','Delivery and facilitation practice.',2),
  (6,'PhD in Information Systems','University of Rwanda',4,2012,2016,'Pass','Information systems research.',1),
  (6,'Leadership in Higher Education Program','RP Karongi College',NULL,2019,2019,'Pass','Academic leadership.',2);

INSERT INTO `employment_records` (`user_id`,`job_title`,`company`,`sector_id`,`location`,`start_date`,`end_date`,`is_current`,`responsibilities`) VALUES
  (1,'UI Engineer','KLab',1,'Kigali','2021-06-01','2023-02-28',0,'Built alumni outreach interfaces.'),
  (1,'Frontend Engineer','Andela',1,'Kigali','2023-03-01',NULL,1,'Design systems and accessibility reviews.'),
  (2,'Research Assistant','University of Rwanda',2,'Kigali','2020-01-15','2021-08-31',0,'Survey design and tracer-study data collection.'),
  (2,'Data Analyst','BK Tech House',2,'Kigali','2021-09-01',NULL,1,'Reporting pipelines and Power BI dashboards.'),
  (3,'Student Ambassador','Coding Club',6,'Kigali','2025-02-01',NULL,1,'Peer programming events and workshops.'),
  (4,'Research Volunteer','Innovation Lab',2,'Huye','2024-09-01',NULL,1,'Tracer-study reporting support.'),
  (5,'Program Coordinator','iDebate',3,'Kigali','2022-03-01','2024-05-31',0,'Workplace readiness sessions.'),
  (5,'Career Services Officer','Career development office',3,'Kigali','2024-06-01',NULL,1,'Employer engagement and placement reporting.'),
  (6,'Head of Department','RP Karongi College',4,'Kigali','2016-09-01','2022-12-31',0,'Department leadership and curriculum review.'),
  (6,'Dean of Student Success','School leadership office',4,'Kigali','2023-01-01',NULL,1,'Graduate outcomes and employer partnerships.');

-- ---------------------------------------------------------------------------
-- CONNECTIONS  (1<->3 and 2<->4 accepted, 6->3 pending)
-- ---------------------------------------------------------------------------
INSERT INTO `connections` (`requester_id`,`addressee_id`,`status`,`message`,`responded_at`) VALUES
  (3,1,'accepted','Would like guidance on React portfolio reviews.', NOW() - INTERVAL 40 DAY),
  (2,4,'accepted','Happy to share analytics dashboard templates.', NOW() - INTERVAL 30 DAY),
  (6,3,'pending','Dean Nshuti would like to connect before the internship cycle.', NULL);

-- ---------------------------------------------------------------------------
-- MENTORSHIP
-- ---------------------------------------------------------------------------
INSERT INTO `mentor_profiles`
  (`user_id`,`headline`,`professional_background`,`areas_of_expertise`,`years_of_experience`,`mentorship_interests`,`max_active_mentees`,`is_accepting`) VALUES
  (1,'Frontend Engineer at Andela','Six years building accessible React products for education and fintech clients.','React, UI Architecture, Accessibility, Frontend Testing',6,'Portfolio reviews, career planning, frontend interview prep',3,1),
  (2,'Data Analyst at BK Tech House','Builds reporting systems for education-sector analytics and tracer studies.','SQL, Power BI, Data Visualization, Reporting',5,'Analytics career paths, dashboard design, SQL coaching',2,1),
  (5,'Career Services Officer','Runs placement, referral and employer engagement programmes at the college.','CV review, Interview preparation, Placement strategy, Stakeholder management',4,'CV clinics, referral guidance, first-job negotiation',4,1);

INSERT INTO `mentorship_requests` (`mentor_id`,`mentee_id`,`career_interests`,`expectations`,`message`,`status`,`responded_at`) VALUES
  (1,3,'Frontend engineering, UI accessibility','Monthly portfolio reviews and mock interviews.','I would like feedback on my React portfolio and interview preparation.',   'accepted', NOW() - INTERVAL 20 DAY),
  (2,4,'Data analytics and reporting','SQL practice and guidance on dashboard projects.','Looking for mentorship on analytics reporting and SQL.',                    'accepted', NOW() - INTERVAL 12 DAY),
  (1,4,'Product design and frontend','Guidance on switching from analytics to frontend.','Exploring a move from analytics into product engineering.', 'pending',  NULL);

INSERT INTO `mentorship_sessions`
  (`mentorship_request_id`,`scheduled_at`,`duration_minutes`,`meeting_mode`,`location_or_link`,`notes`,`status`,`completed_at`) VALUES
  (1, NOW() - INTERVAL 15 DAY, 60, 'virtual', 'https://meet.example.com/alumini/1','Reviewed portfolio structure and accessibility checklist.','completed', NOW() - INTERVAL 15 DAY),
  (1, NOW() + INTERVAL 7 DAY,  45, 'virtual', 'https://meet.example.com/alumini/2','Mock interview: React fundamentals and testing.','scheduled', NULL),
  (2, NOW() - INTERVAL 6 DAY,  60, 'in_person','Career Services Office','Worked through SQL aggregation exercises.','completed', NOW() - INTERVAL 6 DAY);

-- ---------------------------------------------------------------------------
-- JOBS, DOCUMENTS AND APPLICATIONS
-- ---------------------------------------------------------------------------
INSERT INTO `jobs`
  (`id`,`posted_by`,`title`,`company`,`sector_id`,`location`,`employment_type`,`salary_min`,`salary_max`,`salary_currency`,`application_deadline`,`description`,`qualifications`,`application_instructions`,`contact_email`,`status`,`published_at`) VALUES
  (201,1,'Junior Frontend Developer','KLab',1,'Kigali','full_time',450000,700000,'RWF',DATE_ADD(CURDATE(), INTERVAL 21 DAY),
   'Work with the incubation team to ship responsive web interfaces and maintain the alumni outreach portal.',
   'React fundamentals, Git workflow, SCSS',
   'Send your CV and a portfolio link to careers@klab.rw. Reference the job title in the subject line.',
   'careers@klab.rw','open', NOW() - INTERVAL 25 DAY),
  (202,5,'Graduate Data Associate','RISA',2,'Kigali','contract',380000,520000,'RWF',DATE_ADD(CURDATE(), INTERVAL 14 DAY),
   'Support education-sector analytics projects and prepare placement reports for graduate employment programs.',
   'Spreadsheet modelling, presentation skills, SQL basics',
   'Apply through the RISA careers portal with your CV and academic transcript.',
   'talent@risa.gov.rw','open', NOW() - INTERVAL 12 DAY),
  (203,1,'Backend Developer Intern','Andela',1,'Kigali','internship',0,0,'RWF',DATE_ADD(CURDATE(), INTERVAL 10 DAY),
   'Join the platform team to build and maintain PHP and MySQL services for the alumni system.',
   'PHP fundamentals, MySQL, REST API awareness',
   'Email careers@andela.rw with your CV and a short note about your backend project.',
   'careers@andela.rw','open', NOW() - INTERVAL 5 DAY);

INSERT INTO `job_applications` (`id`,`job_id`,`applicant_id`,`status`,`cover_note`,`applied_at`) VALUES
  (1,201,3,'shortlisted','Built three React projects including an alumni directory with MUI DataGrid.', NOW() - INTERVAL 10 DAY),
  (2,201,4,'pending','Interested in the frontend track after finishing my analytics year.', NOW() - INTERVAL 6 DAY),
  (3,202,3,'reviewed','Data coursework and a tracer-study dashboard are in my portfolio.', NOW() - INTERVAL 4 DAY),
  (4,202,4,'accepted','Two years of research volunteering and a working SQL reporting project.', NOW() - INTERVAL 8 DAY);

INSERT INTO `application_status_history` (`application_id`,`from_status`,`to_status`,`changed_by`,`note`,`changed_at`) VALUES
  (1,'pending','reviewed',1,'Portfolio reviewed against the frontend requirements.', NOW() - INTERVAL 9 DAY),
  (1,'reviewed','shortlisted',1,'Strong React and testing evidence.', NOW() - INTERVAL 8 DAY),
  (2,'pending','pending',1,'Awaiting the academic transcript.', NOW() - INTERVAL 5 DAY),
  (3,'pending','reviewed',5,'SQL and spreadsheet evidence confirmed.', NOW() - INTERVAL 3 DAY),
  (4,'pending','reviewed',5,'Confirmed research volunteering.', NOW() - INTERVAL 7 DAY),
  (4,'reviewed','accepted',5,'Offer confirmed for the placement track.', NOW() - INTERVAL 6 DAY);

-- ---------------------------------------------------------------------------
-- EVENTS AND REGISTRATIONS
-- ---------------------------------------------------------------------------
INSERT INTO `events`
  (`id`,`created_by`,`title`,`description`,`category`,`venue`,`event_date`,`starts_at`,`ends_at`,`registration_deadline`,`available_seats`,`seats_taken`,`status`) VALUES
  (301,7,'Alumni Career Fair 2026','Company booths, CV clinics and live interview practice for graduates and final-year students.','career_fair','RP Karongi College Main Hall', DATE_ADD(CURDATE(), INTERVAL 18 DAY),'09:00:00','16:00:00', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 120, 0, 'published'),
  (302,7,'Frontend Engineering Workshop','Hands-on workshop on React, MUI DataGrid and accessible interface patterns.','workshop','ICT Lab 3, RP Karongi College', DATE_ADD(CURDATE(), INTERVAL 32 DAY),'13:30:00','16:30:00', DATE_ADD(CURDATE(), INTERVAL 28 DAY), 40, 0, 'published'),
  (303,7,'Graduation Anniversary Reunion','Alumni reunion for the ten-year graduation cohort with dinner and testimony sessions.','reunion','RP Karongi College Auditorium', DATE_ADD(CURDATE(), INTERVAL 75 DAY),'10:00:00','18:00:00', DATE_ADD(CURDATE(), INTERVAL 65 DAY), 200, 0, 'published');

INSERT INTO `event_registrations` (`event_id`,`user_id`,`status`,`registered_at`,`cancelled_at`,`checked_in_at`) VALUES
  (301,3,'registered', NOW() - INTERVAL 3 DAY, NULL, NULL),
  (301,4,'registered', NOW() - INTERVAL 2 DAY, NULL, NULL),
  (301,1,'attended',   NOW() - INTERVAL 30 DAY, NULL, NOW() - INTERVAL 1 DAY),
  (302,1,'registered', NOW() - INTERVAL 1 DAY, NULL, NULL),
  (302,3,'registered', NOW() - INTERVAL 1 DAY, NULL, NULL),
  (303,2,'registered', NOW() - INTERVAL 5 DAY, NULL, NULL);

UPDATE `events` e
SET e.`seats_taken` = (
  SELECT COUNT(*) FROM `event_registrations` r
  WHERE r.`event_id` = e.`id` AND r.`status` IN ('registered','attended')
)
WHERE e.`id` IN (301,302,303);

-- ---------------------------------------------------------------------------
-- POSTS, COMMENTS AND LIKES
-- ---------------------------------------------------------------------------
INSERT INTO `posts` (`id`,`author_id`,`body`,`status`,`created_at`) VALUES
  (401,1,'Hosted a portfolio clinic for new graduates. Bring one project and leave with a review checklist.','published', NOW() - INTERVAL 4 DAY),
  (402,2,'Shared a dashboard template for alumni tracer studies. Free to reuse for your department.','published', NOW() - INTERVAL 3 DAY),
  (403,3,'Looking for frontend mentorship and internship referrals. Portfolio available on request.','published', NOW() - INTERVAL 2 DAY),
  (404,4,'Open to analytics mentorship and internship guidance in Huye.','published', NOW() - INTERVAL 1 DAY),
  (405,5,'Opened internship referrals for product support roles. Reply if your team needs support graduates.','published', NOW() - INTERVAL 6 HOUR);

INSERT INTO `post_comments` (`post_id`,`author_id`,`body`,`created_at`) VALUES
  (401,3,'Thank you, this was exactly what I needed before the interviews.', NOW() - INTERVAL 3 DAY),
  (401,4,'The checklist approach works well for CV reviews too.', NOW() - INTERVAL 2 DAY),
  (403,1,'Sent you a message with a referral path and a sample project.', NOW() - INTERVAL 1 DAY),
  (405,1,'Shared this with two graduates in the ICT cohort.', NOW() - INTERVAL 2 HOUR);

INSERT INTO `post_likes` (`post_id`,`user_id`,`created_at`) VALUES
  (401,3,NOW() - INTERVAL 3 DAY),(401,4,NOW() - INTERVAL 3 DAY),(401,2,NOW() - INTERVAL 2 DAY),
  (402,1,NOW() - INTERVAL 2 DAY),(402,5,NOW() - INTERVAL 1 DAY),
  (403,1,NOW() - INTERVAL 1 DAY),(403,5,NOW() - INTERVAL 12 HOUR),
  (405,1,NOW() - INTERVAL 4 HOUR),(405,6,NOW() - INTERVAL 3 HOUR);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS AND SETTINGS
-- ---------------------------------------------------------------------------
INSERT INTO `notifications` (`user_id`,`type`,`title`,`body`,`link_path`,`read_at`,`created_at`) VALUES
  (1,'connection','New mentorship request','Sandrine Uwineza sent you a mentorship request.','/mentorship',NULL, NOW() - INTERVAL 1 DAY),
  (3,'application','Application shortlisted','Your application for Junior Frontend Developer was shortlisted.','/jobs/201',NULL, NOW() - INTERVAL 8 DAY),
  (5,'event','Event registration confirmed','You are registered for Alumni Career Fair 2026.','/events/301',NULL, NOW() - INTERVAL 3 DAY),
  (7,'system','Weekly engagement report','The weekly alumni engagement summary is ready to review.','/analytics',NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 2 DAY);

INSERT INTO `platform_settings` (`setting_key`,`setting_value`,`value_type`,`updated_by`) VALUES
  ('platform.name','Alumini-Path','string',7),
  ('platform.tagline','Alumni Networking & Job Referral System','string',7),
  ('directory.page_size','10','integer',7),
  ('jobs.application_deadline_days','30','integer',7),
  ('mentorship.default_capacity','3','integer',7),
  ('events.allow_cancellation','true','boolean',7),
  ('notifications.email_enabled','false','boolean',7),
  ('moderation.auto_hide_threshold','5','integer',7);

INSERT INTO `audit_log` (`actor_id`,`action`,`entity_type`,`entity_id`,`metadata`,`ip_address`,`created_at`) VALUES
  (7,'user.role_assigned','user',5,'{"role":"employee"}','127.0.0.1', NOW() - INTERVAL 6 DAY),
  (7,'event.published','event',301,'{"title":"Alumni Career Fair 2026"}','127.0.0.1', NOW() - INTERVAL 5 DAY),
  (1,'job.published','job',203,'{"title":"Backend Developer Intern"}','10.0.0.5', NOW() - INTERVAL 5 DAY),
  (5,'application.status_changed','job_application',4,'{"from":"reviewed","to":"accepted"}','10.0.0.7', NOW() - INTERVAL 6 DAY);
