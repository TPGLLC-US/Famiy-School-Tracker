-- Create temporary table for student_rewards backup
CREATE TEMP TABLE student_rewards_backup AS 
SELECT * FROM student_rewards;

-- Drop existing student_rewards table
DROP TABLE IF EXISTS student_rewards CASCADE;

-- Recreate student_rewards table with proper relationships
CREATE TABLE student_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email text NOT NULL,
    reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'redeemed')) DEFAULT 'pending',
    parent_approval_status text CHECK (parent_approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    redeemed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_student_reward_redemption UNIQUE (student_email, reward_id, status)
);

-- Restore data from backup
INSERT INTO student_rewards (
    id,
    student_email,
    reward_id,
    status,
    parent_approval_status,
    redeemed_at,
    created_at
)
SELECT 
    id,
    student_email,
    reward_id,
    status,
    parent_approval_status,
    redeemed_at,
    created_at
FROM student_rewards_backup
WHERE reward_id IN (SELECT id FROM rewards);

-- Drop temporary table
DROP TABLE student_rewards_backup;

-- Enable RLS
ALTER TABLE student_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view their own rewards"
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

-- Create indexes
CREATE INDEX idx_student_rewards_student ON student_rewards(student_email);
CREATE INDEX idx_student_rewards_reward ON student_rewards(reward_id);
CREATE INDEX idx_student_rewards_status ON student_rewards(status);
CREATE INDEX idx_student_rewards_parent_status ON student_rewards(parent_approval_status);

-- Grant permissions
GRANT ALL ON student_rewards TO authenticated;