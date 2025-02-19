/*
  # Fix Classes table and policies

  1. Changes
    - Create classes table if it doesn't exist
    - Add proper constraints and indexes
    - Create policies if they don't exist
    
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create the classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student text NOT NULL,
    subject text NOT NULL,
    teacher text NOT NULL,
    email text NOT NULL,
    room_number text,
    extra_help_day text,
    extra_help_time text,
    tests_percentage numeric DEFAULT 0 CHECK (tests_percentage >= 0 AND tests_percentage <= 100),
    quizzes_percentage numeric DEFAULT 0 CHECK (quizzes_percentage >= 0 AND quizzes_percentage <= 100),
    homework_percentage numeric DEFAULT 0 CHECK (homework_percentage >= 0 AND homework_percentage <= 100),
    participation_percentage numeric DEFAULT 0 CHECK (participation_percentage >= 0 AND participation_percentage <= 100),
    projects_percentage numeric DEFAULT 0 CHECK (projects_percentage >= 0 AND projects_percentage <= 100),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT total_percentage_check CHECK (
        COALESCE(tests_percentage, 0) +
        COALESCE(quizzes_percentage, 0) +
        COALESCE(homework_percentage, 0) +
        COALESCE(participation_percentage, 0) +
        COALESCE(projects_percentage, 0) <= 100
    )
);

-- Enable RLS if not already enabled
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
    DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
    DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
    DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;
    
    -- Create new policies
    CREATE POLICY "Users can view their own classes"
        ON classes
        FOR SELECT
        TO authenticated
        USING (student = auth.jwt() ->> 'email');

    CREATE POLICY "Users can insert their own classes"
        ON classes
        FOR INSERT
        TO authenticated
        WITH CHECK (student = auth.jwt() ->> 'email');

    CREATE POLICY "Users can update their own classes"
        ON classes
        FOR UPDATE
        TO authenticated
        USING (student = auth.jwt() ->> 'email')
        WITH CHECK (student = auth.jwt() ->> 'email');

    CREATE POLICY "Users can delete their own classes"
        ON classes
        FOR DELETE
        TO authenticated
        USING (student = auth.jwt() ->> 'email');
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'classes'
        AND indexname = 'idx_classes_student'
    ) THEN
        CREATE INDEX idx_classes_student ON classes(student);
    END IF;
END $$;