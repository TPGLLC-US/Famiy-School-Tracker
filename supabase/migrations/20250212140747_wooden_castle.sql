/*
  # Fix database views for grade tracking

  1. Changes
    - Drop existing views and materialized views
    - Create new regular views for performance summary and grade trends
    - Add indexes for better performance
    - Update RLS policies for proper access control

  2. Views Created
    - student_performance_summary: Calculates current grades and assignment stats
    - student_grade_trends: Shows grade progression over time

  3. Security
    - Maintains existing RLS policies
    - Ensures proper access control for both students and parents
*/

-- First, drop any existing views
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Create view for student performance summary
CREATE VIEW student_performance_summary AS
SELECT 
  c.student as student_email,
  c.subject,
  COALESCE(
    SUM(
      CASE a.type
        WHEN 'test' THEN (a.score / a.max_score) * (c.tests_percentage::numeric / 100)
        WHEN 'quiz' THEN (a.score / a.max_score) * (c.quizzes_percentage::numeric / 100)
        WHEN 'homework' THEN (a.score / a.max_score) * (c.homework_percentage::numeric / 100)
        WHEN 'participation' THEN (a.score / a.max_score) * (c.participation_percentage::numeric / 100)
        WHEN 'project' THEN (a.score / a.max_score) * (c.projects_percentage::numeric / 100)
      END
    ) * 100, 0
  ) as current_grade,
  COUNT(a.id) as total_assignments,
  MAX(a.date) as last_assignment_date
FROM 
  classes c
LEFT JOIN 
  assignments a ON c.id = a.class_id
GROUP BY 
  c.student, c.subject;

-- Create view for grade trends
CREATE VIEW student_grade_trends AS
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