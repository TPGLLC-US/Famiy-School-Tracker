/*
  # Fix user roles and parent-student relationship

  1. Changes
    - Drop and recreate user_roles table with proper constraints
    - Add missing indexes and policies
    - Fix parent_students table constraints
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS parent_students CASCADE;

-- Create user_roles table
CREATE TABLE user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('student', 'parent')),
    created_at timestamptz DEFAULT now()
);

-- Create parent_students table
CREATE TABLE parent_students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid NOT NULL,
    student_email text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(parent_id, student_email)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can read own role"
    ON user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role"
    ON user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Create policies for parent_students
CREATE POLICY "Parents can view their student relationships"
    ON parent_students
    FOR SELECT
    TO authenticated
    USING (parent_id = auth.uid() OR student_email = auth.jwt() ->> 'email');

CREATE POLICY "Parents can create student relationships"
    ON parent_students
    FOR INSERT
    TO authenticated
    WITH CHECK (
        parent_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'parent'
        )
    );

CREATE POLICY "Students can update their relationship status"
    ON parent_students
    FOR UPDATE
    TO authenticated
    USING (student_email = auth.jwt() ->> 'email')
    WITH CHECK (status IN ('approved', 'rejected'));

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student_email ON parent_students(student_email);