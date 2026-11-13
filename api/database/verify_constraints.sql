-- ============================================================================
--  Alumini-Path :: constraint verification harness
--  Run : mysql -u root < api/database/verify_constraints.sql
--  Every case below MUST raise an error. A silent success means the
--  database layer is not enforcing what the spec requires.
-- ============================================================================
USE alumni_network;

SELECT '--- 1. duplicate email (expect ERROR 1062) ---' AS test_case;
INSERT INTO `users` (`role_id`,`full_name`,`email`,`password_hash`) VALUES (2,'Clone Account','aline.mukamana@alumninet.rw','x');

SELECT '--- 2. duplicate email differing only in case (expect ERROR 1062) ---' AS test_case;
INSERT INTO `users` (`role_id`,`full_name`,`email`,`password_hash`) VALUES (2,'Case Clone','ALINE.MUKAMANA@ALUMNINET.RW','x');

SELECT '--- 3. duplicate job application (expect ERROR 1062) ---' AS test_case;
INSERT INTO `job_applications` (`job_id`,`applicant_id`) VALUES (201,3);

SELECT '--- 4. duplicate event registration (expect ERROR 1062) ---' AS test_case;
INSERT INTO `event_registrations` (`event_id`,`user_id`) VALUES (301,3);

SELECT '--- 5. duplicate live connection request, reversed direction (expect ERROR 1062) ---' AS test_case;
INSERT INTO `connections` (`requester_id`,`addressee_id`) VALUES (1,3);

SELECT '--- 6. self connection (expect ERROR 3819 CHECK) ---' AS test_case;
INSERT INTO `connections` (`requester_id`,`addressee_id`) VALUES (1,1);

SELECT '--- 7. event capacity overflow (expect ERROR 3819 CHECK) ---' AS test_case;
UPDATE `events` SET `seats_taken` = `available_seats` + 1 WHERE `id` = 302;

SELECT '--- 8. salary max below min (expect ERROR 3819 CHECK) ---' AS test_case;
INSERT INTO `jobs` (`posted_by`,`title`,`company`,`employment_type`,`salary_min`,`salary_max`,`description`,`contact_email`)
VALUES (1,'Broken Salary Role','KLab','full_time',900000,100000,'x','x@y.rw');

SELECT '--- 9. event end time before start time (expect ERROR 3819 CHECK) ---' AS test_case;
INSERT INTO `events` (`created_by`,`title`,`description`,`venue`,`event_date`,`starts_at`,`ends_at`,`available_seats`)
VALUES (7,'Broken Time Slot','x','Hall',CURDATE(),'18:00:00','09:00:00',10);

SELECT '--- 10. orphan FK: profile for a non-existent user (expect ERROR 1452) ---' AS test_case;
INSERT INTO `alumni_profiles` (`user_id`,`graduation_year`) VALUES (9999,2025);

SELECT '--- 11. invalid status value (expect ERROR 1265) ---' AS test_case;
INSERT INTO `job_applications` (`job_id`,`applicant_id`,`status`) VALUES (201,6,'maybe');

SELECT '--- 12. mentorship request between the same pair twice (expect ERROR 1062) ---' AS test_case;
INSERT INTO `mentorship_requests` (`mentor_id`,`mentee_id`,`career_interests`) VALUES (1,3,'Again');

SELECT '--- 13. self mentorship request (expect ERROR 3819 CHECK) ---' AS test_case;
INSERT INTO `mentorship_requests` (`mentor_id`,`mentee_id`,`career_interests`) VALUES (1,1,'Self');

SELECT '--- 14. zero-length file upload (expect ERROR 3819 CHECK) ---' AS test_case;
INSERT INTO `file_uploads` (`uploader_id`,`upload_context`,`original_name`,`stored_path`,`mime_type`,`size_bytes`,`checksum_sha256`)
VALUES (1,'profile_photo','x.png','uploads/x.png','image/png',0,'abc');

SELECT '--- ALL CONSTRAINT CASES EXECUTED ---' AS test_case;
