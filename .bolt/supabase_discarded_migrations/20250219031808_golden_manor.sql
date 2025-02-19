-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE user_roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('student', 'parent')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student text NOT NULL,
    subject text NOT NULL,
    teacher text NOT NULL,
    email text NOT NULL,
    room_number text,
    extra_help_day text,
    extra_help_time text,
    tests_percentage numeric DEFAULT 40,
    quizzes_percentage numeric DEFAULT 20,
    homework_percentage numeric DEFAULT 20,
    participation_percentage numeric DEFAULT 10,
    projects_percentage numeric DEFAULT 10,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('test', 'quiz', 'homework', 'participation', 'project')),
    score numeric NOT NULL CHECK (score >= 0),
    max_score numeric NOT NULL CHECK (max_score > 0),
    feedback text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE parent_students (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id uuid NOT NULL,
    student_email text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(parent_id, student_email)
);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Users can view own role" ON user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their classes" ON classes
    FOR SELECT TO authenticated
    USING (
        student = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_email = classes.student
            AND status = 'approved'
        )
    );

CREATE POLICY "Users can manage their classes" ON classes
    FOR ALL TO authenticated
    USING (student = auth.jwt() ->> 'email');

CREATE POLICY "Users can view their assignments" ON assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = assignments.class_id
            AND (
                classes.student = auth.jwt() ->> 'email'
                OR EXISTS (
                    SELECT 1 FROM parent_students
                    WHERE parent_id = auth.uid()
                    AND student_email = classes.student
                    AND status = 'approved'
                )
            )
        )
    );

CREATE POLICY "Users can manage their assignments" ON assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = assignments.class_id
            AND classes.student = auth.jwt() ->> 'email'
        )
    );

-- Insert test data
INSERT INTO classes (id, student, subject, teacher, email, room_number, extra_help_day, extra_help_time) VALUES
    (uuid_generate_v4(), 'test@example.com', 'Mathematics', 'John Smith', 'jsmith@school.edu', '101', 'Monday', '3:00 PM'),
    (uuid_generate_v4(), 'test@example.com', 'Science', 'Sarah Johnson', 'sjohnson@school.edu', '202', 'Wednesday', '2:30 PM');

-- Create indexes
CREATE INDEX idx_classes_student ON classes(student);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student_email ON parent_students(student_email);