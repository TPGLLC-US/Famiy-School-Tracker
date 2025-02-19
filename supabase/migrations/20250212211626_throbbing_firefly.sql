-- Add status column to rewards table
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS status text 
CHECK (status IN ('pending', 'approved', 'rejected')) 
DEFAULT 'pending';

-- Update existing rewards to be approved
UPDATE rewards 
SET status = 'approved' 
WHERE status IS NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active rewards" ON rewards;
DROP POLICY IF EXISTS "Parents can create rewards" ON rewards;

-- Create new policies for the rewards table
CREATE POLICY "Users can view approved rewards"
    ON rewards
    FOR SELECT
    TO authenticated
    USING (
        status = 'approved'
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'parent'
        )
    );

CREATE POLICY "Users can create rewards"
    ON rewards
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            -- Parents can create approved rewards directly
            EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role = 'parent'
            )
            AND status = 'approved'
        ) OR (
            -- Students can only create pending rewards
            EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role = 'student'
            )
            AND status = 'pending'
        )
    );

CREATE POLICY "Parents can update rewards"
    ON rewards
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'parent'
        )
    )
    WITH CHECK (status IN ('approved', 'rejected'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_created_by ON rewards(created_by);