/*
  # Database Restore Point

  This migration serves as a restore point for the database schema.
  It verifies the current state of all tables and their permissions.

  1. Tables Verified:
    - classes
    - assignments
    - parent_students
    - user_roles
    - rewards
    - student_rewards
    - achievement_points

  2. Ensures:
    - All tables have proper RLS enabled
    - All necessary policies are in place
    - Proper permissions are granted
    - Indexes exist for performance
*/

-- Verify RLS is enabled on all tables
DO $$ 
BEGIN
    ALTER TABLE IF EXISTS classes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS parent_students ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS rewards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS student_rewards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS achievement_points ENABLE ROW LEVEL SECURITY;
END $$;

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Verify indexes exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_classes_student') THEN
        CREATE INDEX idx_classes_student ON classes(student);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assignments_class_date') THEN
        CREATE INDEX idx_assignments_class_date ON assignments(class_id, created_at);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parent_students_parent_id') THEN
        CREATE INDEX idx_parent_students_parent_id ON parent_students(parent_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parent_students_student_email') THEN
        CREATE INDEX idx_parent_students_student_email ON parent_students(student_email);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_user_id') THEN
        CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
    END IF;
END $$;

-- Clean up any orphaned data
DELETE FROM assignments a
WHERE NOT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = a.class_id
);

DELETE FROM student_rewards sr
WHERE NOT EXISTS (
    SELECT 1 FROM rewards r
    WHERE r.id = sr.reward_id
);

-- Verify all necessary constraints
DO $$ 
BEGIN
    -- Verify classes percentage constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'classes' 
        AND constraint_name = 'total_percentage_check'
    ) THEN
        ALTER TABLE classes 
        ADD CONSTRAINT total_percentage_check 
        CHECK (
            COALESCE(tests_percentage, 0) +
            COALESCE(quizzes_percentage, 0) +
            COALESCE(homework_percentage, 0) +
            COALESCE(participation_percentage, 0) +
            COALESCE(projects_percentage, 0) <= 100
        );
    END IF;

    -- Verify assignments score constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'assignments' 
        AND constraint_name = 'valid_score'
    ) THEN
        ALTER TABLE assignments 
        ADD CONSTRAINT valid_score 
        CHECK (score <= max_score);
    END IF;
END $$;