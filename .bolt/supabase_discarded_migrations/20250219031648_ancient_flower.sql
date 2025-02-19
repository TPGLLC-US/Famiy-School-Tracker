-- Insert test data for user roles
INSERT INTO user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'parent'),
  ('00000000-0000-0000-0000-000000000002', 'student'),
  ('00000000-0000-0000-0000-000000000003', 'student');

-- Insert test data for parent-student relationships
INSERT INTO parent_students (parent_id, student_email, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'student1@test.com', 'approved'),
  ('00000000-0000-0000-0000-000000000001', 'student2@test.com', 'approved');

-- Insert test data for classes
INSERT INTO classes (id, student, subject, teacher, email, room_number, extra_help_day, extra_help_time, tests_percentage, quizzes_percentage, homework_percentage, participation_percentage, projects_percentage) VALUES
  ('00000000-0000-0000-0000-000000000001', 'student1@test.com', 'Mathematics', 'John Smith', 'jsmith@school.edu', '101', 'Monday', '15:00', 40, 20, 20, 10, 10),
  ('00000000-0000-0000-0000-000000000002', 'student1@test.com', 'Science', 'Sarah Johnson', 'sjohnson@school.edu', '202', 'Wednesday', '14:30', 35, 25, 20, 10, 10),
  ('00000000-0000-0000-0000-000000000003', 'student2@test.com', 'History', 'Michael Brown', 'mbrown@school.edu', '303', 'Thursday', '15:30', 30, 20, 25, 15, 10);

-- Insert test data for assignments
INSERT INTO assignments (class_id, name, type, score, max_score, date, feedback) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Algebra Quiz 1', 'quiz', 85, 100, '2025-02-01', 'Good work on equations!'),
  ('00000000-0000-0000-0000-000000000001', 'Geometry Test', 'test', 92, 100, '2025-02-10', 'Excellent understanding of theorems'),
  ('00000000-0000-0000-0000-000000000002', 'Chemistry Lab Report', 'homework', 88, 100, '2025-02-05', 'Well-structured report'),
  ('00000000-0000-0000-0000-000000000002', 'Physics Project', 'project', 95, 100, '2025-02-15', 'Outstanding presentation'),
  ('00000000-0000-0000-0000-000000000003', 'World War II Essay', 'homework', 90, 100, '2025-02-08', 'Great analysis');

-- Insert test data for family groups
INSERT INTO family_groups (id, name, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Smith Family', '00000000-0000-0000-0000-000000000001');

-- Insert test data for family members
INSERT INTO family_members (family_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'parent'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'student'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'student');

-- Insert test data for rewards
INSERT INTO rewards (id, name, description, points_cost, created_by, family_id, is_active, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Extra Screen Time', '1 hour of additional screen time', 100, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, 'approved'),
  ('00000000-0000-0000-0000-000000000002', 'Weekend Movie', 'Choose a movie for family movie night', 200, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, 'approved'),
  ('00000000-0000-0000-0000-000000000003', 'Pizza Party', 'Host a pizza party with friends', 500, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, 'approved');

-- Insert test data for achievement points
INSERT INTO achievement_points (student_email, points, reason, awarded_by) VALUES
  ('student1@test.com', 50, 'Outstanding Math Test Performance', '00000000-0000-0000-0000-000000000001'),
  ('student1@test.com', 30, 'Science Project Excellence', '00000000-0000-0000-0000-000000000001'),
  ('student2@test.com', 40, 'History Essay Achievement', '00000000-0000-0000-0000-000000000001');

-- Insert test data for student rewards
INSERT INTO student_rewards (student_email, reward_id, status, parent_approval_status, redeemed_at) VALUES
  ('student1@test.com', '00000000-0000-0000-0000-000000000001', 'approved', 'approved', NOW()),
  ('student2@test.com', '00000000-0000-0000-0000-000000000002', 'pending', 'pending', NULL);