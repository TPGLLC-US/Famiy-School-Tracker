/*
  # Update Classes table RLS policies

  1. Changes
    - Add student column to Classes table
    - Add RLS policies for Classes table to allow authenticated users to:
      - View their own classes
      - Add new classes
      - Update their own classes

  2. Security
    - Enable RLS on Classes table
    - Add policies for authenticated users to manage their own data
*/

-- Add student column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'student'
  ) THEN
    ALTER TABLE Classes ADD COLUMN student TEXT;
  END IF;
END $$;

-- Update existing rows to use the user's email as student identifier
UPDATE Classes 
SET student = auth.jwt() ->> 'email'
WHERE student IS NULL;

-- Make student column required
ALTER TABLE Classes 
ALTER COLUMN student SET NOT NULL;

-- Enable RLS
ALTER TABLE Classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own classes" ON Classes;
DROP POLICY IF EXISTS "Users can insert their own classes" ON Classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON Classes;

-- Create policies
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