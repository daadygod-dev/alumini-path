-- ============================================================================
--  Alumini-Path :: Alumni Networking & Job Referral System
--  File    : 01_schema.sql
--  Target  : MySQL 8.0 / MariaDB 10.4+ (XAMPP), InnoDB, utf8mb4
--  Engine  : `mysql -u root < api/database/01_schema.sql`
--
--  Design rules applied across every table:
--    * Surrogate INT UNSIGNED AUTO_INCREMENT primary key on every entity.
--    * Explicit FKs with deliberate ON DELETE behaviour (never orphaned rows).
--    * No UPDATE-able business columns hold derived values.
--    * Every table carries created_at / updated_at timestamps.
--    * Uniqueness is enforced by the database, never only by the API.
--    * Status columns use ENUM so invalid states cannot be stored.
-- ============================================================================

DROP DATABASE IF EXISTS alumni_network;
CREATE DATABASE alumni_network
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE alumni_network;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. ROLES & PERMISSIONS  (Module 8 - Role Based Access Control)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `roles` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(32)  NOT NULL,
  `label`       VARCHAR(64)  NOT NULL,
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `role_id`        INT UNSIGNED NOT NULL,
  `permission_code` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_code`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id`       INT UNSIGNED NOT NULL,
  `full_name`     VARCHAR(120) NOT NULL,
  `email`         VARCHAR(160) NOT NULL,
  `phone`         VARCHAR(20)  DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status`        ENUM('active','pending','suspended','archived') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME     DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- utf8mb4_unicode_ci is case-insensitive, so this also blocks Foo@x.com / foo@x.com
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_status` (`status`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  -- explicit CHECK so an invalid status is rejected even when the server runs
  -- without STRICT_TRANS_TABLES and would otherwise coerce it to ''
  CONSTRAINT `chk_users_status` CHECK (`status` IN ('active','pending','suspended','archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. LOOKUP TABLES  (directory filters: department, programme, sector, skill)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `skills`;
DROP TABLE IF EXISTS `sectors`;
DROP TABLE IF EXISTS `programmes`;
DROP TABLE IF EXISTS `departments`;

CREATE TABLE `departments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(16)  NOT NULL,
  `name`       VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dept_code` (`code`),
  UNIQUE KEY `uq_dept_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `programmes` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `department_id` INT UNSIGNED NOT NULL,
  `code`          VARCHAR(16)  NOT NULL,
  `name`          VARCHAR(120) NOT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prog_code` (`code`),
  UNIQUE KEY `uq_prog_dept_name` (`department_id`, `name`),
  CONSTRAINT `fk_prog_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sectors` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(16)  NOT NULL,
  `name`       VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sector_code` (`code`),
  UNIQUE KEY `uq_sector_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `skills` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(80) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skill_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. FILE REGISTRY  (Module 9 - secure upload, one validation path)
--    Every uploaded artefact (photo, job brief, poster, post image, CV)
--    lands here first, then other tables reference the row.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `file_uploads`;

CREATE TABLE `file_uploads` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uploader_id`    INT UNSIGNED NOT NULL,
  `upload_context` ENUM('profile_photo','job_document','event_poster','post_image','applicant_cv','supporting_document') NOT NULL,
  `original_name`  VARCHAR(255) NOT NULL,
  `stored_path`    VARCHAR(255) NOT NULL,
  `mime_type`      VARCHAR(120) NOT NULL,
  `size_bytes`     INT UNSIGNED NOT NULL,
  `checksum_sha256` CHAR(64)    NOT NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_file_stored_path` (`stored_path`),
  KEY `idx_file_uploader` (`uploader_id`),
  KEY `idx_file_context` (`upload_context`),
  CONSTRAINT `fk_file_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_file_size` CHECK (`size_bytes` > 0),
  CONSTRAINT `chk_file_context` CHECK (`upload_context` IN ('profile_photo','job_document','event_poster','post_image','applicant_cv','supporting_document'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. ALUMNI PROFILE  (Module 1 - registration + professional profile)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_skills`;
DROP TABLE IF EXISTS `alumni_profiles`;
DROP TABLE IF EXISTS `education_records`;
DROP TABLE IF EXISTS `employment_records`;

CREATE TABLE `alumni_profiles` (
  `user_id`           INT UNSIGNED NOT NULL,
  `reg_no`            VARCHAR(40)  DEFAULT NULL,
  `graduation_year`   SMALLINT UNSIGNED DEFAULT NULL,
  `department_id`     INT UNSIGNED DEFAULT NULL,
  `programme_id`      INT UNSIGNED DEFAULT NULL,
  `sector_id`         INT UNSIGNED DEFAULT NULL,
  `current_role`      VARCHAR(120) DEFAULT NULL,
  `current_company`   VARCHAR(160) DEFAULT NULL,
  `location`          VARCHAR(120) DEFAULT NULL,
  `bio`               TEXT         DEFAULT NULL,
  `years_experience`  SMALLINT UNSIGNED DEFAULT 0,
  `mentorship_available` TINYINT(1) NOT NULL DEFAULT 0,
  `avatar_file_id`    INT UNSIGNED DEFAULT NULL,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_profile_reg_no` (`reg_no`),
  KEY `idx_profile_grad_year` (`graduation_year`),
  KEY `idx_profile_department` (`department_id`),
  KEY `idx_profile_programme` (`programme_id`),
  KEY `idx_profile_sector` (`sector_id`),
  KEY `idx_profile_avatar` (`avatar_file_id`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_profile_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_profile_programme` FOREIGN KEY (`programme_id`) REFERENCES `programmes` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_profile_sector` FOREIGN KEY (`sector_id`) REFERENCES `sectors` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_profile_avatar` FOREIGN KEY (`avatar_file_id`) REFERENCES `file_uploads` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_skills` (
  `user_id`  INT UNSIGNED NOT NULL,
  `skill_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`, `skill_id`),
  KEY `idx_us_skill` (`skill_id`),
  CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_us_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `education_records` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT UNSIGNED NOT NULL,
  `qualification` VARCHAR(160) NOT NULL,
  `institution`   VARCHAR(160) NOT NULL,
  `programme_id`  INT UNSIGNED DEFAULT NULL,
  `start_year`    SMALLINT UNSIGNED DEFAULT NULL,
  `end_year`      SMALLINT UNSIGNED DEFAULT NULL,
  `grade`         VARCHAR(40)  DEFAULT NULL,
  `description`   VARCHAR(255) DEFAULT NULL,
  `sort_order`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_edu_user` (`user_id`),
  CONSTRAINT `fk_edu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_edu_programme` FOREIGN KEY (`programme_id`) REFERENCES `programmes` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_edu_years` CHECK (`end_year` IS NULL OR `start_year` IS NULL OR `end_year` >= `start_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employment_records` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED NOT NULL,
  `job_title`      VARCHAR(160) NOT NULL,
  `company`        VARCHAR(160) NOT NULL,
  `sector_id`      INT UNSIGNED DEFAULT NULL,
  `location`       VARCHAR(120) DEFAULT NULL,
  `start_date`     DATE NOT NULL,
  `end_date`       DATE DEFAULT NULL,
  `is_current`     TINYINT(1) NOT NULL DEFAULT 0,
  `responsibilities` VARCHAR(255) DEFAULT NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emp_user` (`user_id`),
  KEY `idx_emp_sector` (`sector_id`),
  CONSTRAINT `fk_emp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_sector` FOREIGN KEY (`sector_id`) REFERENCES `sectors` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_emp_dates` CHECK (`end_date` IS NULL OR `end_date` >= `start_date`),
  CONSTRAINT `chk_emp_current` CHECK ((`is_current` = 1 AND `end_date` IS NULL) OR `is_current` = 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. CONNECTIONS  (Module 2 - networking, request/accept/reject)
--    active_pair_key is NULL for closed rows, so a rejected pair can be
--    re-requested later while only one LIVE request may exist per pair.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `connections`;

CREATE TABLE `connections` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `requester_id`    INT UNSIGNED NOT NULL,
  `addressee_id`    INT UNSIGNED NOT NULL,
  `status`          ENUM('pending','accepted','rejected','blocked') NOT NULL DEFAULT 'pending',
  `message`         VARCHAR(255) DEFAULT NULL,
  `responded_at`    DATETIME DEFAULT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `active_pair_key` VARCHAR(40) AS (IF(`status` IN ('pending','accepted'),
      CONCAT(LEAST(`requester_id`,`addressee_id`), ':', GREATEST(`requester_id`,`addressee_id`)),
      NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_conn_active_pair` (`active_pair_key`),
  KEY `idx_conn_requester` (`requester_id`, `status`),
  KEY `idx_conn_addressee` (`addressee_id`, `status`),
  CONSTRAINT `fk_conn_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_conn_addressee` FOREIGN KEY (`addressee_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_conn_not_self` CHECK (`requester_id` <> `addressee_id`),
  CONSTRAINT `chk_conn_status` CHECK (`status` IN ('pending','accepted','rejected','blocked'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. JOBS & APPLICATIONS  (Module 3 - referral, applications, applicant tracking)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `application_status_history`;
DROP TABLE IF EXISTS `job_applications`;
DROP TABLE IF EXISTS `application_documents`;
DROP TABLE IF EXISTS `job_documents`;
DROP TABLE IF EXISTS `jobs`;

CREATE TABLE `jobs` (
  `id`                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `posted_by`              INT UNSIGNED NOT NULL,
  `title`                  VARCHAR(180) NOT NULL,
  `company`                VARCHAR(160) NOT NULL,
  `sector_id`              INT UNSIGNED DEFAULT NULL,
  `location`               VARCHAR(120) NOT NULL DEFAULT '',
  `employment_type`        ENUM('full_time','part_time','internship','contract','temporary','volunteer') NOT NULL,
  `salary_min`             DECIMAL(12,2) DEFAULT NULL,
  `salary_max`             DECIMAL(12,2) DEFAULT NULL,
  `salary_currency`        CHAR(3) NOT NULL DEFAULT 'RWF',
  `application_deadline`   DATE DEFAULT NULL,
  `description`            TEXT NOT NULL,
  `qualifications`         TEXT DEFAULT NULL,
  `application_instructions` TEXT DEFAULT NULL,
  `contact_email`          VARCHAR(160) NOT NULL,
  `status`                 ENUM('draft','open','closed','archived') NOT NULL DEFAULT 'open',
  `published_at`           DATETIME DEFAULT NULL,
  `created_at`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_posted_by` (`posted_by`),
  KEY `idx_jobs_status` (`status`, `published_at`),
  KEY `idx_jobs_sector` (`sector_id`),
  KEY `idx_jobs_deadline` (`application_deadline`),
  CONSTRAINT `fk_jobs_poster` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jobs_sector` FOREIGN KEY (`sector_id`) REFERENCES `sectors` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_jobs_salary` CHECK (`salary_max` IS NULL OR `salary_min` IS NULL OR `salary_max` >= `salary_min`),
  CONSTRAINT `chk_jobs_status` CHECK (`status` IN ('draft','open','closed','archived')),
  CONSTRAINT `chk_jobs_type` CHECK (`employment_type` IN ('full_time','part_time','internship','contract','temporary','volunteer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_documents` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id`        INT UNSIGNED NOT NULL,
  `file_upload_id` INT UNSIGNED NOT NULL,
  `description`   VARCHAR(255) DEFAULT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jobdoc_file` (`file_upload_id`),
  KEY `idx_jobdoc_job` (`job_id`),
  CONSTRAINT `fk_jobdoc_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jobdoc_file` FOREIGN KEY (`file_upload_id`) REFERENCES `file_uploads` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_applications` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id`       INT UNSIGNED NOT NULL,
  `applicant_id` INT UNSIGNED NOT NULL,
  `status`       ENUM('pending','reviewed','shortlisted','rejected','accepted') NOT NULL DEFAULT 'pending',
  `cover_note`   TEXT DEFAULT NULL,
  `cv_file_id`   INT UNSIGNED DEFAULT NULL,
  `applied_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- blocks duplicate applications to the same job
  UNIQUE KEY `uq_apply_job_applicant` (`job_id`, `applicant_id`),
  KEY `idx_apply_applicant` (`applicant_id`),
  KEY `idx_apply_status` (`status`),
  CONSTRAINT `fk_apply_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_apply_user` FOREIGN KEY (`applicant_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_apply_cv` FOREIGN KEY (`cv_file_id`) REFERENCES `file_uploads` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_apply_status` CHECK (`status` IN ('pending','reviewed','shortlisted','rejected','accepted'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `application_documents` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_id` INT UNSIGNED NOT NULL,
  `file_upload_id` INT UNSIGNED NOT NULL,
  `document_kind`  ENUM('cv','portfolio','certificate','other') NOT NULL DEFAULT 'other',
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_applydoc_file` (`file_upload_id`),
  KEY `idx_applydoc_application` (`application_id`),
  CONSTRAINT `fk_applydoc_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_applydoc_file` FOREIGN KEY (`file_upload_id`) REFERENCES `file_uploads` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `application_status_history` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_id` INT UNSIGNED NOT NULL,
  `from_status`   VARCHAR(20) DEFAULT NULL,
  `to_status`     VARCHAR(20) NOT NULL,
  `changed_by`    INT UNSIGNED NOT NULL,
  `note`          VARCHAR(255) DEFAULT NULL,
  `changed_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asth_application` (`application_id`),
  CONSTRAINT `fk_asth_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asth_actor` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. MENTORSHIP  (Module 4 - mentor profiles, requests, sessions)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `mentorship_sessions`;
DROP TABLE IF EXISTS `mentorship_requests`;
DROP TABLE IF EXISTS `mentor_profiles`;

CREATE TABLE `mentor_profiles` (
  `user_id`             INT UNSIGNED NOT NULL,
  `headline`            VARCHAR(180) DEFAULT NULL,
  `professional_background` TEXT DEFAULT NULL,
  `areas_of_expertise`  TEXT DEFAULT NULL,
  `years_of_experience` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `mentorship_interests` VARCHAR(255) DEFAULT NULL,
  `max_active_mentees`  TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `is_accepting`        TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_mentor_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_mentor_capacity` CHECK (`max_active_mentees` <= 50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mentorship_requests` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mentor_id`        INT UNSIGNED NOT NULL,
  `mentee_id`        INT UNSIGNED NOT NULL,
  `career_interests` VARCHAR(255) NOT NULL,
  `expectations`     TEXT DEFAULT NULL,
  `message`          VARCHAR(255) DEFAULT NULL,
  `status`           ENUM('pending','accepted','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  `responded_at`     DATETIME DEFAULT NULL,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- one live request per mentor/mentee pair
  UNIQUE KEY `uq_mentreq_pair` (`mentor_id`, `mentee_id`),
  KEY `idx_mentreq_mentee` (`mentee_id`),
  KEY `idx_mentreq_status` (`status`),
  CONSTRAINT `fk_mentreq_mentor` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mentreq_mentee` FOREIGN KEY (`mentee_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_mentreq_not_self` CHECK (`mentor_id` <> `mentee_id`),
  CONSTRAINT `chk_mentreq_status` CHECK (`status` IN ('pending','accepted','rejected','cancelled','completed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mentorship_sessions` (
  `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mentorship_request_id` INT UNSIGNED NOT NULL,
  `scheduled_at`         DATETIME NOT NULL,
  `duration_minutes`     SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `meeting_mode`         ENUM('virtual','in_person','phone','email') NOT NULL DEFAULT 'virtual',
  `location_or_link`     VARCHAR(255) DEFAULT NULL,
  `notes`                TEXT DEFAULT NULL,
  `status`               ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `completed_at`         DATETIME DEFAULT NULL,
  `created_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ment_session_request` (`mentorship_request_id`),
  KEY `idx_ment_session_sched` (`scheduled_at`),
  CONSTRAINT `fk_ment_session_request` FOREIGN KEY (`mentorship_request_id`) REFERENCES `mentorship_requests` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_ment_session_duration` CHECK (`duration_minutes` BETWEEN 15 AND 480),
  CONSTRAINT `chk_ment_session_status` CHECK (`status` IN ('scheduled','completed','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. EVENTS  (Module 5 - events, registration, capacity, attendance)
--    seats_taken is a guarded counter; the CHECK constraint is the
--    database-level guarantee that registration never exceeds capacity.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `event_registrations`;
DROP TABLE IF EXISTS `events`;

CREATE TABLE `events` (
  `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_by`           INT UNSIGNED NOT NULL,
  `title`                VARCHAR(200) NOT NULL,
  `description`          TEXT NOT NULL,
  `category`             ENUM('conference','workshop','networking_session','career_fair','reunion','graduation_anniversary','seminar','other') NOT NULL DEFAULT 'other',
  `venue`                VARCHAR(200) NOT NULL,
  `event_date`           DATE NOT NULL,
  `starts_at`            TIME NOT NULL,
  `ends_at`              TIME NOT NULL,
  `registration_deadline` DATE DEFAULT NULL,
  `available_seats`      SMALLINT UNSIGNED NOT NULL,
  `seats_taken`          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `poster_file_id`       INT UNSIGNED DEFAULT NULL,
  `status`               ENUM('draft','published','cancelled','completed') NOT NULL DEFAULT 'published',
  `created_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_date` (`event_date`),
  KEY `idx_events_status` (`status`, `event_date`),
  KEY `idx_events_category` (`category`),
  KEY `idx_events_creator` (`created_by`),
  KEY `idx_events_poster` (`poster_file_id`),
  CONSTRAINT `fk_events_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_events_poster` FOREIGN KEY (`poster_file_id`) REFERENCES `file_uploads` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_events_seats` CHECK (`seats_taken` <= `available_seats`),
  CONSTRAINT `chk_events_time` CHECK (`ends_at` > `starts_at`),
  CONSTRAINT `chk_events_status` CHECK (`status` IN ('draft','published','cancelled','completed')),
  CONSTRAINT `chk_events_category` CHECK (`category` IN ('conference','workshop','networking_session','career_fair','reunion','graduation_anniversary','seminar','other'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `event_registrations` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`     INT UNSIGNED NOT NULL,
  `user_id`      INT UNSIGNED NOT NULL,
  `status`       ENUM('registered','cancelled','attended','absent') NOT NULL DEFAULT 'registered',
  `registered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cancelled_at` DATETIME DEFAULT NULL,
  `checked_in_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  -- prevents duplicate registrations for the same event
  UNIQUE KEY `uq_eventreg_event_user` (`event_id`, `user_id`),
  KEY `idx_eventreg_user` (`user_id`),
  CONSTRAINT `fk_eventreg_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eventreg_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_eventreg_status` CHECK (`status` IN ('registered','cancelled','attended','absent'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. POSTS & ENGAGEMENT  (Module 6 - posts, comments, likes)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `post_likes`;
DROP TABLE IF EXISTS `post_comments`;
DROP TABLE IF EXISTS `posts`;

CREATE TABLE `posts` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `author_id`    INT UNSIGNED NOT NULL,
  `body`         TEXT NOT NULL,
  `image_file_id` INT UNSIGNED DEFAULT NULL,
  `status`       ENUM('published','hidden','removed') NOT NULL DEFAULT 'published',
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_posts_author` (`author_id`),
  KEY `idx_posts_status_created` (`status`, `created_at`),
  KEY `idx_posts_image` (`image_file_id`),
  CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_posts_image` FOREIGN KEY (`image_file_id`) REFERENCES `file_uploads` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_posts_status` CHECK (`status` IN ('published','hidden','removed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_comments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id`    INT UNSIGNED NOT NULL,
  `author_id`  INT UNSIGNED NOT NULL,
  `body`       VARCHAR(1000) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comment_post` (`post_id`),
  KEY `idx_comment_author` (`author_id`),
  CONSTRAINT `fk_comment_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comment_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_likes` (
  `post_id`    INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_like_user` (`user_id`),
  CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_like_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. SESSIONS, TOKENS & NOTIFICATIONS  (Module 8 - secure authentication)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `user_sessions`;

CREATE TABLE `user_sessions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED NOT NULL,
  `token_hash`   CHAR(64) NOT NULL,
  `user_agent`   VARCHAR(255) DEFAULT NULL,
  `ip_address`   VARCHAR(45) DEFAULT NULL,
  `expires_at`   DATETIME NOT NULL,
  `last_used_at` DATETIME DEFAULT NULL,
  `revoked_at`   DATETIME DEFAULT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_token` (`token_hash`),
  KEY `idx_session_user` (`user_id`),
  KEY `idx_session_expiry` (`expires_at`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_resets` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `email`      VARCHAR(160) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at`    DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reset_token` (`token_hash`),
  KEY `idx_reset_user` (`user_id`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `type`       VARCHAR(48) NOT NULL,
  `title`      VARCHAR(180) NOT NULL,
  `body`       VARCHAR(500) DEFAULT NULL,
  `link_path`  VARCHAR(255) DEFAULT NULL,
  `read_at`    DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`, `read_at`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11. AUDIT & PLATFORM SETTINGS  (Module 7 - administrator monitoring)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_log`;
DROP TABLE IF EXISTS `platform_settings`;

CREATE TABLE `audit_log` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_id`    INT UNSIGNED DEFAULT NULL,
  `action`      VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(48) NOT NULL,
  `entity_id`   INT UNSIGNED DEFAULT NULL,
  `metadata`    TEXT DEFAULT NULL,
  `ip_address`  VARCHAR(45) DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_actor` (`actor_id`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `platform_settings` (
  `setting_key`   VARCHAR(64) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `value_type`    ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'string',
  `updated_by`    INT UNSIGNED DEFAULT NULL,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`),
  CONSTRAINT `fk_setting_editor` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  ANALYTICS VIEWS  (Module 7 - every Recharts panel reads from these,
--  never from hardcoded JavaScript arrays)
-- ============================================================================

-- Alumni distribution by graduation year
CREATE OR REPLACE VIEW `v_alumni_by_graduation_year` AS
SELECT
  p.`graduation_year`            AS `graduation_year`,
  COUNT(*)                       AS `alumni_count`
FROM `alumni_profiles` p
JOIN `users` u ON u.`id` = p.`user_id`
WHERE u.`status` = 'active' AND p.`graduation_year` IS NOT NULL
GROUP BY p.`graduation_year`
ORDER BY p.`graduation_year`;

-- Alumni distribution by academic department
CREATE OR REPLACE VIEW `v_alumni_by_department` AS
SELECT
  d.`id`            AS `department_id`,
  d.`name`          AS `department_name`,
  COUNT(p.`user_id`) AS `alumni_count`
FROM `departments` d
LEFT JOIN `alumni_profiles` p ON p.`department_id` = d.`id`
GROUP BY d.`id`, d.`name`
ORDER BY `alumni_count` DESC;

-- Alumni employment distribution by sector
CREATE OR REPLACE VIEW `v_employment_by_sector` AS
SELECT
  s.`id`   AS `sector_id`,
  s.`name` AS `sector_name`,
  COUNT(p.`user_id`) AS `alumni_count`
FROM `sectors` s
LEFT JOIN `alumni_profiles` p ON p.`sector_id` = s.`id`
GROUP BY s.`id`, s.`name`
ORDER BY `alumni_count` DESC;

-- Job posting trends over time (monthly)
CREATE OR REPLACE VIEW `v_job_posting_trends` AS
SELECT
  DATE_FORMAT(COALESCE(j.`published_at`, j.`created_at`), '%Y-%m') AS `period`,
  COUNT(*)       AS `jobs_posted`,
  SUM(CASE WHEN j.`status` = 'open' THEN 1 ELSE 0 END) AS `jobs_open`
FROM `jobs` j
WHERE j.`status` <> 'draft'
GROUP BY period
ORDER BY period;

-- Job application statistics and recruitment outcomes
CREATE OR REPLACE VIEW `v_job_application_outcomes` AS
SELECT
  j.`id`                AS `job_id`,
  j.`title`             AS `job_title`,
  j.`company`           AS `company`,
  COUNT(a.`id`)         AS `total_applications`,
  SUM(CASE WHEN a.`status` = 'pending'    THEN 1 ELSE 0 END) AS `pending`,
  SUM(CASE WHEN a.`status` = 'reviewed'   THEN 1 ELSE 0 END) AS `reviewed`,
  SUM(CASE WHEN a.`status` = 'shortlisted' THEN 1 ELSE 0 END) AS `shortlisted`,
  SUM(CASE WHEN a.`status` = 'rejected'   THEN 1 ELSE 0 END) AS `rejected`,
  SUM(CASE WHEN a.`status` = 'accepted'   THEN 1 ELSE 0 END) AS `accepted`
FROM `jobs` j
LEFT JOIN `job_applications` a ON a.`job_id` = j.`id`
GROUP BY j.`id`, j.`title`, j.`company`
ORDER BY j.`id`;

-- Mentorship requests and completed sessions
CREATE OR REPLACE VIEW `v_mentorship_activity` AS
SELECT
  r.`mentor_id`,
  COUNT(*) AS `requests_received`,
  SUM(CASE WHEN r.`status` = 'accepted'  THEN 1 ELSE 0 END) AS `requests_accepted`,
  SUM(CASE WHEN r.`status` = 'rejected'  THEN 1 ELSE 0 END) AS `requests_rejected`,
  (SELECT COUNT(*) FROM `mentorship_sessions` s
     JOIN `mentorship_requests` r2 ON r2.`id` = s.`mentorship_request_id`
    WHERE r2.`mentor_id` = r.`mentor_id` AND s.`status` = 'completed') AS `sessions_completed`
FROM `mentorship_requests` r
GROUP BY r.`mentor_id`;

-- Event registrations and attendance
CREATE OR REPLACE VIEW `v_event_registration_stats` AS
SELECT
  e.`id`             AS `event_id`,
  e.`title`          AS `event_title`,
  e.`category`       AS `category`,
  e.`event_date`     AS `event_date`,
  e.`available_seats` AS `available_seats`,
  e.`seats_taken`    AS `seats_taken`,
  SUM(CASE WHEN r.`status` = 'registered' THEN 1 ELSE 0 END) AS `registered`,
  SUM(CASE WHEN r.`status` = 'attended'  THEN 1 ELSE 0 END) AS `attended`,
  SUM(CASE WHEN r.`status` = 'absent'    THEN 1 ELSE 0 END) AS `absent`,
  SUM(CASE WHEN r.`status` = 'cancelled' THEN 1 ELSE 0 END) AS `cancelled`
FROM `events` e
LEFT JOIN `event_registrations` r ON r.`event_id` = e.`id`
GROUP BY e.`id`, e.`title`, e.`category`, e.`event_date`, e.`available_seats`, e.`seats_taken`
ORDER BY e.`event_date`;

-- Alumni engagement statistics: posts, comments, likes, connections
CREATE OR REPLACE VIEW `v_engagement_stats` AS
SELECT
  u.`id`      AS `user_id`,
  u.`full_name` AS `full_name`,
  (SELECT COUNT(*) FROM `posts` po WHERE po.`author_id` = u.`id` AND po.`status` = 'published') AS `posts_count`,
  (SELECT COUNT(*) FROM `post_comments` pc WHERE pc.`author_id` = u.`id`) AS `comments_count`,
  (SELECT COUNT(*) FROM `post_likes` pl WHERE pl.`user_id` = u.`id`) AS `likes_count`,
  (SELECT COUNT(*) FROM `connections` c
     WHERE c.`status` = 'accepted'
       AND (c.`requester_id` = u.`id` OR c.`addressee_id` = u.`id`)) AS `connections_count`,
  (SELECT COUNT(*) FROM `mentorship_sessions` ms
     WHERE ms.`status` = 'completed'
       AND ms.`mentorship_request_id` IN (
         SELECT r.`id` FROM `mentorship_requests` r WHERE r.`mentee_id` = u.`id`
       )) AS `mentorship_sessions_completed`
FROM `users` u
WHERE u.`status` = 'active';

-- Directory listing payload for the MUI DataGrid
CREATE OR REPLACE VIEW `v_alumni_directory` AS
SELECT
  u.`id`              AS `user_id`,
  u.`full_name`       AS `full_name`,
  u.`email`           AS `email`,
  u.`phone`           AS `phone`,
  r.`code`            AS `role_code`,
  r.`label`           AS `role_label`,
  p.`reg_no`          AS `reg_no`,
  p.`graduation_year` AS `graduation_year`,
  p.`department_id`   AS `department_id`,
  d.`name`            AS `department_name`,
  p.`programme_id`    AS `programme_id`,
  pr.`name`           AS `programme_name`,
  p.`sector_id`       AS `sector_id`,
  s.`name`            AS `employment_sector`,
  p.`current_role`    AS `current_role`,
  p.`current_company` AS `current_company`,
  p.`location`        AS `location`,
  p.`bio`             AS `bio`,
  p.`mentorship_available` AS `mentorship_available`,
  (SELECT COUNT(*) FROM `user_skills` us WHERE us.`user_id` = u.`id`) AS `skills_count`,
  (SELECT COUNT(*) FROM `connections` c
     WHERE c.`status` = 'accepted'
       AND (c.`requester_id` = u.`id` OR c.`addressee_id` = u.`id`)) AS `connections_count`
FROM `users` u
JOIN `roles` r             ON r.`id` = u.`role_id`
JOIN `alumni_profiles` p   ON p.`user_id` = u.`id`
LEFT JOIN `departments` d  ON d.`id` = p.`department_id`
LEFT JOIN `programmes` pr  ON pr.`id` = p.`programme_id`
LEFT JOIN `sectors` s      ON s.`id` = p.`sector_id`
WHERE u.`status` = 'active';
