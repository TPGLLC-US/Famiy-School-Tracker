-- Drop existing policies
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Parents can manage family members" ON family_members;

-- Create new non-recursive policies
CREATE POLICY "Users can view family members"
    ON family_members
    FOR SELECT
    TO authenticated
    USING (
        -- User is a member of the family
        family_id IN (
            SELECT family_id 
            FROM family_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Parents can manage family members"
    ON family_members
    FOR ALL
    TO authenticated
    USING (
        -- User is a parent in this family
        EXISTS (
            SELECT 1 
            FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'parent'
            AND EXISTS (
                SELECT 1 
                FROM family_members 
                WHERE user_id = auth.uid()
                AND family_id = family_members.family_id
            )
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_composite 
ON family_members(family_id, user_id);