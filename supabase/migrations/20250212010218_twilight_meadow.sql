/*
  # Parent Dashboard Views

  1. New Materialized Views
    - `student_performance_summary` - Aggregates student grades and performance metrics
    - `student_grade_trends` - Tracks grade changes over time

  2. Security
    - Add RLS policies for parent access to views through base tables
*/

-- Create materialized view for student performance summary
CREATE MATERIALIZED VIEW student_performance_summary AS
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

-- Create materialized view for grade trends
CREATE MATERIALIZED VIEW student_grade_trends AS
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
CREATE UNIQUE INDEX idx_student_performance_email_subject 
  ON student_performance_summary(student_email, subject);

CREATE INDEX idx_student_grade_trends_email_date 
  ON student_grade_trends(student_email, date);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_grade_views()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY student_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY student_grade_trends;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh views when data changes
CREATE TRIGGER refresh_grade_views_on_assignment
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_grade_views();

CREATE TRIGGER refresh_grade_views_on_class
  AFTER INSERT OR UPDATE OR DELETE ON classes
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_grade_views();

-- Add RLS policies to base tables for parent access
CREATE POLICY "Parents can view linked students' classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_students
      WHERE parent_id = auth.uid()
      AND student_email = classes.student
      AND status = 'approved'
    )
  );

CREATE POLICY "Parents can view linked students' assignments"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN parent_students ps ON c.student = ps.student_email
      WHERE ps.parent_id = auth.uid()
      AND ps.status = 'approved'
      AND c.id = assignments.class_id
    )
  );