-- Drop existing views
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Drop existing policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
    DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
    DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
    DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Ensure classes table has correct structure
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
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT total_percentage_check CHECK (
        COALESCE(tests_percentage, 0) +
        COALESCE(quizzes_percentage, 0) +
        COALESCE(homework_percentage, 0) +
        COALESCE(participation_percentage, 0) +
        COALESCE(projects_percentage, 0) <= 100
    )
);

-- Reset RLS
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON classes TO authenticated;

-- Create RLS policies
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student);