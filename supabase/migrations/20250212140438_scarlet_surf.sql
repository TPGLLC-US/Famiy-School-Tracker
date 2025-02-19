/*
  # Replace materialized views with regular views

  1. Changes
    - Drop existing views and materialized views
    - Create regular views for performance summary and grade trends
    - Add indexes on base tables for performance
    - Update RLS policies for proper access control

  2. Security
    - Views inherit RLS from base tables
    - Updated policies ensure proper access for both students and parents
*/

-- Drop existing materialized views if they exist
DROP MATERIALIZED VIEW IF EXISTS student_performance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS student_grade_trends CASCADE;

-- Drop existing views if they exist
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Create regular views
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own classes" ON classes;
DROP POLICY IF EXISTS "Users can view own assignments" ON assignments;

-- Create policies for base tables
CREATE POLICY "Users can view own classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    student = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM parent_students
      WHERE parent_id = auth.uid()
      AND student_email = classes.student
      AND status = 'approved'
    )
  );

CREATE POLICY "Users can view own assignments"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id
      AND (
        c.student = auth.jwt() ->> 'email'
        OR EXISTS (
          SELECT 1 FROM parent_students ps
          WHERE ps.parent_id = auth.uid()
          AND ps.student_email = c.student
          AND ps.status = 'approved'
        )
      )
    )
  );