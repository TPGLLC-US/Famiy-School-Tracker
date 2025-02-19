-- Create redemption_logs table
CREATE TABLE redemption_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email text NOT NULL,
    reward_id uuid NOT NULL REFERENCES rewards(id),
    attempted_at timestamptz DEFAULT now(),
    error_message text,
    success boolean DEFAULT false,
    points_balance integer,
    reward_cost integer
);

-- Enable RLS on logs
ALTER TABLE redemption_logs ENABLE ROW LEVEL SECURITY;

-- Add unique constraint to prevent duplicate redemptions
ALTER TABLE student_rewards 
ADD CONSTRAINT unique_student_reward_status 
UNIQUE NULLS NOT DISTINCT (student_email, reward_id, status);

-- Create view for redemption history
CREATE OR REPLACE VIEW redemption_history AS
SELECT 
    sr.id,
    sr.student_email,
    sr.reward_id,
    r.name as reward_name,
    r.points_cost,
    sr.status,
    sr.parent_approval_status,
    sr.created_at as redemption_date,
    sr.redeemed_at,
    r.description as reward_description
FROM student_rewards sr
JOIN rewards r ON r.id = sr.reward_id
ORDER BY sr.created_at DESC;

-- Grant access to view
GRANT SELECT ON redemption_history TO authenticated;

-- Create policies for logs
CREATE POLICY "Users can view their own logs"
    ON redemption_logs
    FOR SELECT
    TO authenticated
    USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "System can insert logs"
    ON redemption_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_redemption_logs_student ON redemption_logs(student_email);
CREATE INDEX idx_redemption_logs_reward ON redemption_logs(reward_id);
CREATE INDEX idx_redemption_logs_date ON redemption_logs(attempted_at);