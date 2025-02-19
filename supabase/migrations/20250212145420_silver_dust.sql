-- First ensure we clean up any existing objects
DROP VIEW IF EXISTS student_performance_summary CASCADE;
DROP VIEW IF EXISTS student_grade_trends CASCADE;

-- Create security definer functions to handle data access
CREATE OR REPLACE FUNCTION get_student_performance(p_student_email text)
RETURNS TABLE (
    student text,
    subject text,
    teacher text,
    email text,
    room_number text,
    extra_help_day text,
    extra_help_time text,
    tests_percentage numeric,
    quizzes_percentage numeric,
    homework_percentage numeric,
    participation_percentage numeric,
    projects_percentage numeric,
    current_grade numeric,
    total_assignments bigint,
    last_assignment_date timestamptz
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.student,
        c.subject,
        c.teacher,
        c.email,
        c.room_number,
        c.extra_help_day,
        c.extra_help_time,
        c.tests_percentage,
        c.quizzes_percentage,
        c.homework_percentage,
        c.participation_percentage,
        c.projects_percentage,
        COALESCE(
            SUM(
                CASE a.type
                    WHEN 'test' THEN (a.score / a.max_score) * (c.tests_percentage::numeric / 100)
                    WHEN 'quiz' THEN (a.score / a.max_score) * (c.quizzes_percentage::numeric / 100)
                    WHEN 'homework' THEN (a.score / a.max_score) * (c.homework_percentage::numeric / 100)
                    WHEN 'participation' THEN (a.score / a.max_score) * (c.participation_percentage::numeric / 100)
                    WHEN 'project' THEN (a.score / a.max_score) * (c.projects_percentage::numeric / 100)
                END
            ) * 100 / 
            NULLIF(SUM(
                CASE a.type
                    WHEN 'test' THEN c.tests_percentage::numeric / 100
                    WHEN 'quiz' THEN c.quizzes_percentage::numeric / 100
                    WHEN 'homework' THEN c.homework_percentage::numeric / 100
                    WHEN 'participation' THEN c.participation_percentage::numeric / 100
                    WHEN 'project' THEN c.projects_percentage::numeric / 100
                END
            ), 0),
            0
        ) as current_grade,
        COUNT(a.id) as total_assignments,
        MAX(a.created_at) as last_assignment_date
    FROM 
        classes c
    LEFT JOIN 
        assignments a ON c.id = a.class_id
    WHERE 
        c.student = p_student_email
    GROUP BY 
        c.student,
        c.subject,
        c.teacher,
        c.email,
        c.room_number,
        c.extra_help_day,
        c.extra_help_time,
        c.tests_percentage,
        c.quizzes_percentage,
        c.homework_percentage,
        c.participation_percentage,
        c.projects_percentage;
END;
$$ LANGUAGE plpgsql;

-- Create function for grade trends
CREATE OR REPLACE FUNCTION get_student_grade_trends(p_student_email text)
RETURNS TABLE (
    student text,
    subject text,
    date timestamptz,
    assignment_type text,
    grade_percentage numeric
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.student,
        c.subject,
        a.created_at,
        a.type::text,
        (a.score / a.max_score * 100) as grade_percentage
    FROM 
        classes c
    JOIN 
        assignments a ON c.id = a.class_id
    WHERE 
        c.student = p_student_email
    ORDER BY 
        c.student, c.subject, a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create views that use the security definer functions
CREATE VIEW student_performance_summary AS
SELECT * FROM get_student_performance(auth.jwt() ->> 'email');

CREATE VIEW student_grade_trends AS
SELECT * FROM get_student_grade_trends(auth.jwt() ->> 'email');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_student_performance(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_grade_trends(text) TO authenticated;
GRANT SELECT ON student_performance_summary TO authenticated;
GRANT SELECT ON student_grade_trends TO authenticated;

-- Refresh indexes
DROP INDEX IF EXISTS idx_classes_student_subject;
DROP INDEX IF EXISTS idx_assignments_class_date;

CREATE INDEX idx_classes_student_subject ON classes(student, subject);
CREATE INDEX idx_assignments_class_date ON assignments(class_id, created_at);