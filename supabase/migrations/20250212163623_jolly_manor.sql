-- Drop existing views if they exist
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;

-- Create RLS policies for classes
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

CREATE POLICY "Users can insert their own classes"
    ON classes FOR INSERT
    TO authenticated
    WITH CHECK (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own classes"
    ON classes FOR UPDATE
    TO authenticated
    USING (student = auth.jwt() ->> 'email')
    WITH CHECK (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete their own classes"
    ON classes FOR DELETE
    TO authenticated
    USING (student = auth.jwt() ->> 'email');

-- Ensure proper permissions
GRANT ALL ON classes TO authenticated;
GRANT ALL ON assignments TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student);
CREATE INDEX IF NOT EXISTS idx_assignments_class_date ON assignments(class_id, created_at);