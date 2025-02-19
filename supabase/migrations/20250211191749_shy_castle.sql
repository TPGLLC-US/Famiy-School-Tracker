/*
  # Update grades table schema

  1. Changes
    - Add subject_id column to grades table
    - Add foreign key constraint
    - Update RLS policies
*/

-- Add subject_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grades' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE grades ADD COLUMN subject_id text NOT NULL;
  END IF;
END $$;

-- Create index for subject_id
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read own grades" ON grades;

CREATE POLICY "Users can read own grades"
  ON grades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.subject = grades.subject_id 
      AND classes.student = auth.jwt() ->> 'email'
    )
  );