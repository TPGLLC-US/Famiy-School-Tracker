/*
  # Add Assignments Management

  1. New Tables
    - assignments
      - id (uuid, primary key)
      - class_id (integer, references classes)
      - name (text)
      - type (enum: test, quiz, homework, participation, project)
      - score (numeric)
      - max_score (numeric)
      - date (date)
      - feedback (text, optional)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on assignments table
    - Add policies for authenticated users to manage their own assignments
*/

-- Drop existing assignments table and type if they exist
DROP TABLE IF EXISTS assignments;
DROP TYPE IF EXISTS assignment_type;

-- Create assignment type enum
CREATE TYPE assignment_type AS ENUM ('test', 'quiz', 'homework', 'participation', 'project');

-- Create assignments table
CREATE TABLE assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id integer NOT NULL,
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
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
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
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_type ON assignments(type);
CREATE INDEX idx_assignments_date ON assignments(date);