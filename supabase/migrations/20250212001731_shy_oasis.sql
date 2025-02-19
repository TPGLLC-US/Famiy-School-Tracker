/*
  # Add user roles table

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role` (text, either 'student' or 'parent')
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `user_roles` table
    - Add policy for authenticated users to read their own role
*/

-- Create user_roles table
CREATE TABLE user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('student', 'parent')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own role"
    ON user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);