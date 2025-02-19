/*
  # Fix Materialized View Dependencies

  1. Changes
    - Drop existing trigger function that references materialized views
    - Clean up any remaining references to materialized views
    - Ensure proper view permissions
*/

-- Drop the trigger function that's causing the error
DROP FUNCTION IF EXISTS refresh_grade_views() CASCADE;

-- Drop any remaining triggers that might reference the function
DROP TRIGGER IF EXISTS refresh_grade_views_on_assignment ON assignments;
DROP TRIGGER IF EXISTS refresh_grade_views_on_class ON classes;

-- Ensure proper permissions on existing views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Verify RLS policies
DO $$ 
BEGIN
    -- Verify classes policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' 
        AND policyname = 'Users can view their own classes'
    ) THEN
        CREATE POLICY "Users can view their own classes"
            ON classes FOR SELECT
            TO authenticated
            USING (
                student = auth.jwt() ->> 'email'
                OR EXISTS (
                    SELECT 1 FROM parent_students
                    WHERE parent_id = auth.uid()
                    AND student_email = classes.student
                    AND status = 'approved'
                )
            );
    END IF;

    -- Verify assignments policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assignments' 
        AND policyname = 'Users can view their own assignments'
    ) THEN
        CREATE POLICY "Users can view their own assignments"
            ON assignments FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM classes c
                    WHERE c.id = assignments.class_id
                    AND (
                        c.student = auth.jwt() ->> 'email'
                        OR EXISTS (
                            SELECT 1 FROM parent_students ps
                            WHERE ps.parent_id = auth.uid()
                            AND ps.student_email = c.student
                            AND ps.status = 'approved'
                        )
                    )
                )
            );
    END IF;
END $$;