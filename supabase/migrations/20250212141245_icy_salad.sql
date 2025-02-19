/*
  # Fix database views for grade tracking

  1. Changes
    - Fix date column reference in views
    - Update view logic for better grade calculations
    - Maintain proper table references

  2. Views Created
    - student_performance_summary: Calculates weighted grades and assignment stats
    - student_grade_trends: Tracks grade progression over time

  3. Security
    - Grant proper permissions to authenticated users
*/

-- First, ensure we drop any existing views
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Create view for student performance summary
CREATE OR REPLACE VIEW student_performance_summary AS
WITH weighted_grades AS (
  SELECT 
    c.student,
    c.subject,
    a.type,
    a.score,
    a.max_score,
    a.date,
    CASE a.type
      WHEN 'test' THEN c.tests_percentage
      WHEN 'quiz' THEN c.quizzes_percentage
      WHEN 'homework' THEN c.homework_percentage
      WHEN 'participation' THEN c.participation_percentage
      WHEN 'project' THEN c.projects_percentage
    END as weight
  FROM classes c
  LEFT JOIN assignments a ON c.id = a.class_id
)
SELECT 
  student as student_email,
  subject,
  COALESCE(
    SUM((score / max_score) * (weight::numeric / 100)) * 100 / 
    NULLIF(SUM(CASE WHEN score IS NOT NULL THEN weight::numeric / 100 END), 0),
    0
  ) as current_grade,
  COUNT(*) FILTER (WHERE score IS NOT NULL) as total_assignments,
  MAX(date) as last_assignment_date
FROM weighted_grades
GROUP BY student, subject;

-- Create view for grade trends
CREATE OR REPLACE VIEW student_grade_trends AS
SELECT 
  c.student as student_email,
  c.subject,
  a.date,
  a.type,
  (a.score / a.max_score * 100) as grade_percentage
FROM 
  classes c
JOIN 
  assignments a ON c.id = a.class_id
ORDER BY 
  c.student, c.subject, a.date DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_student_subject 
  ON classes(student, subject);

CREATE INDEX IF NOT EXISTS idx_assignments_class_date 
  ON assignments(class_id, date);

-- Grant access to authenticated users
GRANT SELECT ON student_performance_summary TO authenticated;
GRANT SELECT ON student_grade_trends TO authenticated;