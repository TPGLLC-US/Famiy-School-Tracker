-- Drop existing views
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Ensure classes table has correct structure and permissions
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Grant explicit permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON classes TO authenticated;

-- Create basic RLS policies
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

-- Create minimal views without complex logic
CREATE VIEW student_performance_summary AS
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
    created_at
FROM classes;

CREATE VIEW student_grade_trends AS
SELECT 
    student as student_email,
    subject,
    created_at as date
FROM classes;

-- Grant view permissions
GRANT SELECT ON student_performance_summary TO authenticated;
GRANT SELECT ON student_grade_trends TO authenticated;