-- Drop existing views temporarily
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Ensure classes table exists with correct structure
CREATE TABLE IF NOT EXISTS classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher TEXT NOT NULL,
    email TEXT NOT NULL,
    room_number TEXT,
    extra_help_day TEXT,
    extra_help_time TEXT,
    tests_percentage NUMERIC DEFAULT 0 CHECK (tests_percentage >= 0 AND tests_percentage <= 100),
    quizzes_percentage NUMERIC DEFAULT 0 CHECK (quizzes_percentage >= 0 AND quizzes_percentage <= 100),
    homework_percentage NUMERIC DEFAULT 0 CHECK (homework_percentage >= 0 AND homework_percentage <= 100),
    participation_percentage NUMERIC DEFAULT 0 CHECK (participation_percentage >= 0 AND participation_percentage <= 100),
    projects_percentage NUMERIC DEFAULT 0 CHECK (projects_percentage >= 0 AND projects_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;

-- Create basic policies
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

-- Recreate the views
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

-- Grant permissions
GRANT SELECT ON student_performance_summary TO authenticated;
GRANT SELECT ON student_grade_trends TO authenticated;
GRANT ALL ON classes TO authenticated;