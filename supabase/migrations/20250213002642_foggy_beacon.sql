-- Drop existing policies
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Parents can manage family members" ON family_members;

-- Create simplified policies without recursion
CREATE POLICY "Users can view family members"
    ON family_members
    FOR SELECT
    TO authenticated
    USING (
        -- Direct membership check
        user_id = auth.uid()
        OR
        -- Parent access to family members
        EXISTS (
            SELECT 1 
            FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'parent'
            AND EXISTS (
                SELECT 1 
                FROM family_members fm
                WHERE fm.user_id = auth.uid()
                AND fm.family_id = family_members.family_id
            )
        )
    );

CREATE POLICY "Parents can manage family members"
    ON family_members
    FOR ALL
    TO authenticated
    USING (
        -- Only parents can manage members
        EXISTS (
            SELECT 1 
            FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'parent'
            AND EXISTS (
                SELECT 1 
                FROM family_members fm
                WHERE fm.user_id = auth.uid()
                AND fm.family_id = family_members.family_id
            )
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_role_user 
ON family_members(user_id, family_id);