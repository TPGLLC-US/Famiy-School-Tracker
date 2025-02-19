-- Drop existing views
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Ensure classes table has correct permissions
GRANT ALL ON classes TO authenticated;

-- Create simplified views that won't interfere with table operations
CREATE VIEW student_performance_summary AS
SELECT 
    c.student as student_email,
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
    0 as current_grade,
    0 as total_assignments,
    c.created_at as last_assignment_date
FROM 
    classes c;

CREATE VIEW student_grade_trends AS
SELECT 
    c.student as student_email,
    c.subject,
    c.created_at as date,
    'test'::assignment_type as type,
    0 as grade_percentage
FROM 
    classes c
WHERE false;

-- Grant view permissions
GRANT SELECT ON student_performance_summary TO authenticated;
GRANT SELECT ON student_grade_trends TO authenticated;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;

CREATE POLICY "Users can view their own classes"
    ON classes FOR SELECT
    TO authenticated
    USING (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert their own classes"
    ON classes FOR INSERT
    TO authenticated
    WITH CHECK (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own classes"
    ON classes FOR UPDATE
    TO authenticated
    USING (student = auth.jwt() ->> 'email')
    WITH CHECK (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete their own classes"
    ON classes FOR DELETE
    TO authenticated
    USING (student = auth.jwt() ->> 'email');