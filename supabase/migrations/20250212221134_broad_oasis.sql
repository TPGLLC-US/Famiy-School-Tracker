/*
  # Reward Redemption System Update

  1. Changes
    - Add requires_parent_approval to rewards table
    - Add parent_approval_status to student_rewards table
    - Update RLS policies
    - Add indexes for performance

  2. Security
    - Maintain existing RLS policies
    - Add new policies for parent approval workflow
*/

-- Add requires_parent_approval to rewards table
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS requires_parent_approval boolean DEFAULT true;

-- Update student_rewards table
ALTER TABLE student_rewards
ADD COLUMN IF NOT EXISTS parent_approval_status text 
CHECK (parent_approval_status IN ('pending', 'approved', 'rejected'))
DEFAULT 'pending';

-- Create index for parent approval queries
CREATE INDEX IF NOT EXISTS idx_student_rewards_parent_approval 
ON student_rewards(parent_approval_status);

-- Update RLS policies for parent approval workflow
CREATE POLICY "Parents can approve redemptions"
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
    WITH CHECK (
        parent_approval_status IN ('approved', 'rejected')
    );