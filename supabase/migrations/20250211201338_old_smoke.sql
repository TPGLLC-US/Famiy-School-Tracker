/*
  # Parent Role and Rewards System

  1. New Tables
    - `parent_students`
      - Links parents to students
      - Tracks relationship status (pending/approved)
    - `rewards`
      - Stores available rewards that can be redeemed
      - Includes point cost and description
    - `student_rewards`
      - Tracks earned and redeemed rewards
      - Stores redemption status and history
    - `achievement_points`
      - Tracks points earned by students
      - Records point source and reason

  2. Security
    - Enable RLS on all new tables
    - Add policies for parent and student access
    - Ensure data privacy between different parent-student relationships

  3. Changes
    - Add parent role to auth schema
    - Create linking system for parent-student relationships
*/

-- Create parent_students table for relationship management
CREATE TABLE parent_students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid NOT NULL,
    student_email text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(parent_id, student_email)
);

-- Create rewards table for available rewards
CREATE TABLE rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    points_cost integer NOT NULL CHECK (points_cost > 0),
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create student_rewards table for tracking earned/redeemed rewards
CREATE TABLE student_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email text NOT NULL,
    reward_id uuid NOT NULL REFERENCES rewards(id),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'redeemed')),
    approved_by uuid,
    redeemed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Create achievement_points table for tracking student points
CREATE TABLE achievement_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email text NOT NULL,
    points integer NOT NULL CHECK (points > 0),
    reason text NOT NULL,
    awarded_by uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_points ENABLE ROW LEVEL SECURITY;

-- Parent-Student Relationship Policies
CREATE POLICY "Parents can view their student relationships"
    ON parent_students
    FOR SELECT
    TO authenticated
    USING (parent_id = auth.uid());

CREATE POLICY "Parents can create student relationships"
    ON parent_students
    FOR INSERT
    TO authenticated
    WITH CHECK (parent_id = auth.uid());

-- Rewards Policies
CREATE POLICY "Anyone can view active rewards"
    ON rewards
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Parents can create rewards"
    ON rewards
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND status = 'approved'
        )
    );

-- Student Rewards Policies
CREATE POLICY "Students can view their rewards"
    ON student_rewards
    FOR SELECT
    TO authenticated
    USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "Parents can view their students' rewards"
    ON student_rewards
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_email = student_rewards.student_email
            AND status = 'approved'
        )
    );

CREATE POLICY "Parents can approve rewards"
    ON student_rewards
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_email = student_rewards.student_email
            AND status = 'approved'
        )
    )
    WITH CHECK (status IN ('approved', 'rejected'));

-- Achievement Points Policies
CREATE POLICY "Students can view their points"
    ON achievement_points
    FOR SELECT
    TO authenticated
    USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "Parents can view their students' points"
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

CREATE POLICY "Parents can award points"
    ON achievement_points
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_email = achievement_points.student_email
            AND status = 'approved'
        )
        AND awarded_by = auth.uid()
    );

-- Create indexes for better query performance
CREATE INDEX idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student_email ON parent_students(student_email);
CREATE INDEX idx_student_rewards_student_email ON student_rewards(student_email);
CREATE INDEX idx_achievement_points_student_email ON achievement_points(student_email);