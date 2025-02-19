-- First drop any existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their family groups" ON family_groups;
    DROP POLICY IF EXISTS "Users can view family rewards" ON rewards;
    DROP POLICY IF EXISTS "Users can view their rewards" ON student_rewards;
    DROP POLICY IF EXISTS "Students can redeem rewards" ON student_rewards;
    DROP POLICY IF EXISTS "Parents can update redemption status" ON student_rewards;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Ensure family_groups table exists with proper structure
CREATE TABLE IF NOT EXISTS family_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Ensure rewards table has proper structure
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES family_groups(id),
ADD COLUMN IF NOT EXISTS requires_parent_approval boolean DEFAULT true;

-- Ensure student_rewards table has proper structure
ALTER TABLE student_rewards
ADD COLUMN IF NOT EXISTS parent_approval_status text 
CHECK (parent_approval_status IN ('pending', 'approved', 'rejected'))
DEFAULT 'pending';

-- Enable RLS
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_rewards ENABLE ROW LEVEL SECURITY;

-- Create new policies for family_groups
CREATE POLICY "Users can view their family groups"
    ON family_groups
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members
            WHERE family_id = family_groups.id
            AND user_id = auth.uid()
        )
    );

-- Create new policies for rewards
CREATE POLICY "Users can view family rewards"
    ON rewards
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members
            WHERE family_id = rewards.family_id
            AND user_id = auth.uid()
        )
        AND (
            status = 'approved'
            OR created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role = 'parent'
            )
        )
    );

-- Create new policies for student_rewards
CREATE POLICY "Users can view their rewards"
    ON student_rewards
    FOR SELECT
    TO authenticated
    USING (
        student_email = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM rewards r
            JOIN family_members fm ON fm.family_id = r.family_id
            WHERE r.id = student_rewards.reward_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'parent'
        )
    );

CREATE POLICY "Students can redeem rewards"
    ON student_rewards
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_email = auth.jwt() ->> 'email'
        AND EXISTS (
            SELECT 1 FROM rewards r
            WHERE r.id = reward_id
            AND r.status = 'approved'
            AND r.is_active = true
        )
    );

CREATE POLICY "Parents can update redemption status"
    ON student_rewards
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rewards r
            JOIN family_members fm ON fm.family_id = r.family_id
            WHERE r.id = student_rewards.reward_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'parent'
        )
    )
    WITH CHECK (
        parent_approval_status IN ('approved', 'rejected')
    );

-- Create or update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rewards_family_id ON rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_student_rewards_reward_id ON student_rewards(reward_id);
CREATE INDEX IF NOT EXISTS idx_student_rewards_student_email ON student_rewards(student_email);
CREATE INDEX IF NOT EXISTS idx_student_rewards_status ON student_rewards(status);
CREATE INDEX IF NOT EXISTS idx_student_rewards_parent_status ON student_rewards(parent_approval_status);

-- Grant permissions
GRANT ALL ON rewards TO authenticated;
GRANT ALL ON student_rewards TO authenticated;
GRANT ALL ON family_groups TO authenticated;