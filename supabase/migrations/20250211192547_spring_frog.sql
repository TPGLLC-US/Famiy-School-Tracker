/*
  # Update database schema for classes and assignments

  1. Changes
    - Drop existing tables and types with proper CASCADE
    - Recreate classes table with UUID primary key
    - Create assignments table with proper foreign key reference
    - Set up all necessary indexes and constraints
    - Establish RLS policies for both tables

  2. Security
    - Enable RLS on both tables
    - Create policies for authenticated users
    - Ensure proper data access control
*/

-- First drop everything with CASCADE to handle dependencies
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TYPE IF EXISTS assignment_type CASCADE;

-- Create classes table with UUID
CREATE TABLE classes (
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

-- Create assignment type enum
CREATE TYPE assignment_type AS ENUM ('test', 'quiz', 'homework', 'participation', 'project');

-- Create assignments table with UUID foreign key
CREATE TABLE assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL,
    name text NOT NULL,
    type assignment_type NOT NULL,
    score numeric NOT NULL CHECK (score >= 0),
    max_score numeric NOT NULL CHECK (max_score > 0),
    date date NOT NULL DEFAULT CURRENT_DATE,
    feedback text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_score CHECK (score <= max_score),
    CONSTRAINT fk_class
        FOREIGN KEY (class_id)
        REFERENCES classes(id)
        ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for classes
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

-- Create policies for assignments
CREATE POLICY "Users can view their own assignments"
    ON assignments
    FOR SELECT
    TO authenticated
    USING (
        class_id IN (
            SELECT id FROM classes 
            WHERE student = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert their own assignments"
    ON assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        class_id IN (
            SELECT id FROM classes 
            WHERE student = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can update their own assignments"
    ON assignments
    FOR UPDATE
    TO authenticated
    USING (
        class_id IN (
            SELECT id FROM classes 
            WHERE student = auth.jwt() ->> 'email'
        )
    )
    WITH CHECK (
        class_id IN (
            SELECT id FROM classes 
            WHERE student = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can delete their own assignments"
    ON assignments
    FOR DELETE
    TO authenticated
    USING (
        class_id IN (
            SELECT id FROM classes 
            WHERE student = auth.jwt() ->> 'email'
        )
    );

-- Create indexes for better query performance
CREATE INDEX idx_classes_student ON classes(student);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_type ON assignments(type);
CREATE INDEX idx_assignments_date ON assignments(date);