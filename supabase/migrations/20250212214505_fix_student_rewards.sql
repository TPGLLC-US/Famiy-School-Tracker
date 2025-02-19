-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own rewards" ON student_rewards;
DROP POLICY IF EXISTS "Students can redeem rewards" ON student_rewards;
DROP POLICY IF EXISTS "Parents can view their students rewards" ON student_rewards;

-- Enable RLS
ALTER TABLE student_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies for student_rewards table
CREATE POLICY "Students can view their own rewards"
    ON student_rewards
    FOR SELECT
    TO authenticated
    USING (
        student_email = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM parent_students
            WHERE parent_id = auth.uid()
            AND student_email = student_rewards.student_email
            AND status = 'approved'
        )
    );

CREATE POLICY "Students can redeem rewards"
    ON student_rewards
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Student can only redeem rewards for themselves
        student_email = auth.jwt() ->> 'email'
        -- Reward must exist and be approved
        AND EXISTS (
            SELECT 1 FROM rewards r
            WHERE r.id = reward_id
            AND r.status = 'approved'
            AND r.is_active = true
        )
    );

CREATE POLICY "Parents can update reward status"
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
    WITH CHECK (status IN ('approved', 'rejected', 'redeemed'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_rewards_student_email 
    ON student_rewards(student_email);
CREATE INDEX IF NOT EXISTS idx_student_rewards_reward_id 
    ON student_rewards(reward_id);
CREATE INDEX IF NOT EXISTS idx_student_rewards_status 
    ON student_rewards(status);

-- Grant necessary permissions
GRANT ALL ON student_rewards TO authenticated;
