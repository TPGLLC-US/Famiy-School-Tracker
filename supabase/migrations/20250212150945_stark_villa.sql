/*
  # Fix student performance views

  1. Changes
    - Create student performance summary view
    - Create grade trends view
    - Set up proper permissions

  2. Security
    - Grant proper permissions to authenticated users
*/

-- Drop existing views if they exist
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Create view for student performance summary
CREATE OR REPLACE VIEW student_performance_summary AS
WITH weighted_grades AS (
  SELECT 
    c.student,
    c.subject,
    c.teacher,
    c.email,
    c.room_number,
    c.extra_help_day,
    c.extra_help_time,
    c.tests_percentage,
    c.quizzes_percentage,
    c.homework_percentage,
    c.participation_percentage,
    c.projects_percentage,
    a.type,
    a.score,
    a.max_score,
    a.created_at
  FROM classes c
  LEFT JOIN assignments a ON c.id = a.class_id
)
SELECT 
  student as student_email,
  subject,
  teacher,
  email,
  room_number,
  extra_help_day,
  extra_help_time,
  tests_percentage,
  quizzes_percentage,
  homework_percentage,
  participation_percentage,
  projects_percentage,
  COALESCE(
    SUM(
      CASE type
        WHEN 'test' THEN (score / max_score) * (tests_percentage::numeric / 100)
        WHEN 'quiz' THEN (score / max_score) * (quizzes_percentage::numeric / 100)
        WHEN 'homework' THEN (score / max_score) * (homework_percentage::numeric / 100)
        WHEN 'participation' THEN (score / max_score) * (participation_percentage::numeric / 100)
        WHEN 'project' THEN (score / max_score) * (projects_percentage::numeric / 100)
      END
    ) * 100 / 
    NULLIF(SUM(
      CASE type
        WHEN 'test' THEN tests_percentage::numeric / 100
        WHEN 'quiz' THEN quizzes_percentage::numeric / 100
        WHEN 'homework' THEN homework_percentage::numeric / 100
        WHEN 'participation' THEN participation_percentage::numeric / 100
        WHEN 'project' THEN projects_percentage::numeric / 100
      END
    ), 0),
    0
  ) as current_grade,
  COUNT(*) FILTER (WHERE score IS NOT NULL) as total_assignments,
  MAX(created_at) as last_assignment_date
FROM weighted_grades
GROUP BY 
  student,
  subject,
  teacher,
  email,
  room_number,
  extra_help_day,
  extra_help_time,
  tests_percentage,
  quizzes_percentage,
  homework_percentage,
  participation_percentage,
  projects_percentage;

-- Create view for grade trends
CREATE OR REPLACE VIEW student_grade_trends AS
SELECT 
  c.student as student_email,
  c.subject,
  a.created_at as date,
  a.type,
  (a.score / a.max_score * 100) as grade_percentage
FROM 
  classes c
JOIN 
  assignments a ON c.id = a.class_id
ORDER BY 
  c.student, c.subject, a.created_at DESC;

-- Grant permissions
GRANT SELECT ON student_performance_summary TO authenticated;
GRANT SELECT ON student_grade_trends TO authenticated;