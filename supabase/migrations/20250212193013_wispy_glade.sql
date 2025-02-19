/*
  # Fix Database Schema and Remove View References

  1. Changes
    - Drop any remaining references to materialized views
    - Drop trigger functions that try to refresh materialized views
    - Ensure proper table permissions and RLS policies
    - Clean up any orphaned data
*/

-- Drop any remaining trigger functions
DROP FUNCTION IF EXISTS refresh_grade_views() CASCADE;

-- Drop any remaining triggers
DROP TRIGGER IF EXISTS refresh_grade_views_on_assignment ON assignments;
DROP TRIGGER IF EXISTS refresh_grade_views_on_class ON classes;

-- Drop any remaining views
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Ensure proper permissions
GRANT ALL ON classes TO authenticated;
GRANT ALL ON assignments TO authenticated;

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

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' 
        AND policyname = 'Users can insert their own classes'
    ) THEN
        CREATE POLICY "Users can insert their own classes"
            ON classes FOR INSERT
            TO authenticated
            WITH CHECK (student = auth.jwt() ->> 'email');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' 
        AND policyname = 'Users can update their own classes'
    ) THEN
        CREATE POLICY "Users can update their own classes"
            ON classes FOR UPDATE
            TO authenticated
            USING (student = auth.jwt() ->> 'email')
            WITH CHECK (student = auth.jwt() ->> 'email');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' 
        AND policyname = 'Users can delete their own classes'
    ) THEN
        CREATE POLICY "Users can delete their own classes"
            ON classes FOR DELETE
            TO authenticated
            USING (student = auth.jwt() ->> 'email');
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

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assignments' 
        AND policyname = 'Users can insert their own assignments'
    ) THEN
        CREATE POLICY "Users can insert their own assignments"
            ON assignments FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM classes c
                    WHERE c.id = assignments.class_id
                    AND c.student = auth.jwt() ->> 'email'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assignments' 
        AND policyname = 'Users can update their own assignments'
    ) THEN
        CREATE POLICY "Users can update their own assignments"
            ON assignments FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM classes c
                    WHERE c.id = assignments.class_id
                    AND c.student = auth.jwt() ->> 'email'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assignments' 
        AND policyname = 'Users can delete their own assignments'
    ) THEN
        CREATE POLICY "Users can delete their own assignments"
            ON assignments FOR DELETE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM classes c
                    WHERE c.id = assignments.class_id
                    AND c.student = auth.jwt() ->> 'email'
                )
            );
    END IF;
END $$;

-- Clean up orphaned assignments
DELETE FROM assignments a
WHERE NOT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = a.class_id
);