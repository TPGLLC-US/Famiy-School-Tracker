-- Add helper function to validate percentage totals
CREATE OR REPLACE FUNCTION validate_class_percentages(
    tests numeric,
    quizzes numeric,
    homework numeric,
    participation numeric,
    projects numeric
) RETURNS boolean AS $$
BEGIN
    RETURN (
        COALESCE(tests, 0) +
        COALESCE(quizzes, 0) +
        COALESCE(homework, 0) +
        COALESCE(participation, 0) +
        COALESCE(projects, 0)
    ) <= 100;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate percentages before insert/update
CREATE OR REPLACE FUNCTION check_class_percentages()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT validate_class_percentages(
        NEW.tests_percentage,
        NEW.quizzes_percentage,
        NEW.homework_percentage,
        NEW.participation_percentage,
        NEW.projects_percentage
    ) THEN
        RAISE EXCEPTION 'Total percentage cannot exceed 100%%';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_class_percentages_trigger ON classes;

-- Create trigger
CREATE TRIGGER check_class_percentages_trigger
    BEFORE INSERT OR UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION check_class_percentages();

-- Ensure proper RLS policies for class import
DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
CREATE POLICY "Users can insert their own classes"
    ON classes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_email = classes.student
            AND status = 'approved'
        )
    );

-- Add function to handle percentage string to numeric conversion
CREATE OR REPLACE FUNCTION parse_percentage(percentage text)
RETURNS numeric AS $$
BEGIN
    -- Remove % sign if present and convert to numeric
    RETURN NULLIF(TRIM(BOTH ' %' FROM percentage), '')::numeric;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql;