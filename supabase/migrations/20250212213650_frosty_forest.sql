-- Create RLS policies for achievement_points table
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Parents can award points to linked students" ON achievement_points;
    DROP POLICY IF EXISTS "Students can view their own points" ON achievement_points;
    DROP POLICY IF EXISTS "Parents can view their students points" ON achievement_points;
    
    -- Enable RLS
    ALTER TABLE achievement_points ENABLE ROW LEVEL SECURITY;

    -- Create policies one at a time
    CREATE POLICY "Parents can award points to linked students"
        ON achievement_points
        FOR INSERT
        TO authenticated
        WITH CHECK (
            -- Verify the user is a parent
            EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role = 'parent'
            )
            -- Verify the parent is linked to the student and approved
            AND EXISTS (
                SELECT 1 FROM parent_students
                WHERE parent_id = auth.uid()
                AND student_email = achievement_points.student_email
                AND status = 'approved'
            )
            -- Ensure awarded_by matches the authenticated user
            AND awarded_by = auth.uid()
        );

    CREATE POLICY "Students can view their own points"
        ON achievement_points
        FOR SELECT
        TO authenticated
        USING (
            student_email = auth.jwt() ->> 'email'
        );

    CREATE POLICY "Parents can view their students points"
        ON achievement_points
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM parent_students
                WHERE parent_id = auth.uid()
                AND student_email = achievement_points.student_email
                AND status = 'approved'
            )
        );

    -- Create indexes if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_achievement_points_student_email'
    ) THEN
        CREATE INDEX idx_achievement_points_student_email 
            ON achievement_points(student_email);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_achievement_points_awarded_by'
    ) THEN
        CREATE INDEX idx_achievement_points_awarded_by 
            ON achievement_points(awarded_by);
    END IF;

    -- Grant necessary permissions
    GRANT ALL ON achievement_points TO authenticated;

EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error creating RLS policies: %', SQLERRM;
    -- Re-raise the error
    RAISE;
END $$;