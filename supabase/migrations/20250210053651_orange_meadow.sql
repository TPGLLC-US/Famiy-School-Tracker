/*
  # Fix Classes table structure and RLS policies

  1. Changes
    - Drop and recreate Classes table with proper structure
    - Add proper RLS policies
    - Ensure all percentage fields are numeric
    - Add proper constraints and defaults

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing table and recreate with proper structure
DROP TABLE IF EXISTS Classes CASCADE;

CREATE TABLE Classes (
    id SERIAL PRIMARY KEY,
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

-- Enable RLS
ALTER TABLE Classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own classes" ON Classes;
DROP POLICY IF EXISTS "Users can insert their own classes" ON Classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON Classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON Classes;

-- Create RLS policies
CREATE POLICY "Users can view their own classes"
    ON Classes
    FOR SELECT
    TO authenticated
    USING (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert their own classes"
    ON Classes
    FOR INSERT
    TO authenticated
    WITH CHECK (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own classes"
    ON Classes
    FOR UPDATE
    TO authenticated
    USING (student = auth.jwt() ->> 'email')
    WITH CHECK (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete their own classes"
    ON Classes
    FOR DELETE
    TO authenticated
    USING (student = auth.jwt() ->> 'email');

-- Create index for better query performance
CREATE INDEX idx_classes_student ON Classes(student);