-- Create family_groups table first
CREATE TABLE IF NOT EXISTS family_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES family_groups(id),
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('parent', 'student')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(family_id, user_id)
);

-- Enable RLS
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Create initial family groups for existing parents
INSERT INTO family_groups (name, created_by)
SELECT DISTINCT 
    'Family of ' || ur.user_id,
    ur.user_id
FROM user_roles ur
WHERE ur.role = 'parent'
ON CONFLICT DO NOTHING;

-- Add family members for existing parent-student relationships
INSERT INTO family_members (family_id, user_id, role)
SELECT DISTINCT 
    fg.id,
    ur.user_id,
    ur.role
FROM user_roles ur
JOIN family_groups fg ON fg.created_by = ur.user_id
WHERE ur.role = 'parent'
ON CONFLICT DO NOTHING;

INSERT INTO family_members (family_id, user_id, role)
SELECT DISTINCT 
    fg.id,
    ur.user_id,
    ur.role
FROM parent_students ps
JOIN user_roles ur ON ur.user_id IN (
    SELECT id FROM auth.users WHERE email = ps.student_email
)
JOIN family_groups fg ON fg.created_by = ps.parent_id
WHERE ps.status = 'approved'
AND ur.role = 'student'
ON CONFLICT DO NOTHING;

-- Create temporary table for rewards backup
CREATE TEMP TABLE rewards_backup AS SELECT * FROM rewards;

-- Drop existing rewards table
DROP TABLE rewards CASCADE;

-- Recreate rewards table with family_id
CREATE TABLE rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    points_cost integer NOT NULL CHECK (points_cost > 0),
    created_by uuid NOT NULL,
    family_id uuid NOT NULL REFERENCES family_groups(id),
    is_active boolean DEFAULT true,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Restore rewards data with family_id
INSERT INTO rewards (id, name, description, points_cost, created_by, is_active, status, created_at, family_id)
SELECT 
    rb.id,
    rb.name,
    rb.description,
    rb.points_cost,
    rb.created_by,
    rb.is_active,
    rb.status,
    rb.created_at,
    fg.id as family_id
FROM rewards_backup rb
JOIN family_groups fg ON fg.created_by = rb.created_by;

-- Drop temporary table
DROP TABLE rewards_backup;

-- Create indexes
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_rewards_family_id ON rewards(family_id);

-- Create policies for family_groups
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

CREATE POLICY "Parents can create family groups"
    ON family_groups
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'parent'
        )
        AND created_by = auth.uid()
    );

-- Create policies for family_members
CREATE POLICY "Users can view family members"
    ON family_members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members fm
            WHERE fm.family_id = family_members.family_id
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "Parents can manage family members"
    ON family_members
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM family_members fm
            JOIN user_roles ur ON ur.user_id = auth.uid()
            WHERE fm.family_id = family_members.family_id
            AND fm.user_id = auth.uid()
            AND ur.role = 'parent'
        )
    );

-- Create policies for rewards
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

CREATE POLICY "Users can create rewards"
    ON rewards
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM family_members
            WHERE family_id = rewards.family_id
            AND user_id = auth.uid()
        )
    );

-- Function to automatically create family group when parent signs up
CREATE OR REPLACE FUNCTION create_family_group()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create family group for parents
    IF NEW.role = 'parent' THEN
        -- Create family group
        WITH new_family AS (
            INSERT INTO family_groups (name, created_by)
            VALUES (
                'Family of ' || NEW.user_id,
                NEW.user_id
            )
            RETURNING id
        )
        -- Add parent as family member
        INSERT INTO family_members (family_id, user_id, role)
        SELECT id, NEW.user_id, 'parent'
        FROM new_family;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic family group creation
DROP TRIGGER IF EXISTS create_family_group_trigger ON user_roles;
CREATE TRIGGER create_family_group_trigger
    AFTER INSERT ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION create_family_group();

-- Function to automatically add student to parent's family when linked
CREATE OR REPLACE FUNCTION add_student_to_family()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        -- Get parent's family group
        INSERT INTO family_members (family_id, user_id, role)
        SELECT DISTINCT fg.id, (
            SELECT user_id 
            FROM user_roles 
            WHERE role = 'student' 
            AND user_id IN (
                SELECT id 
                FROM auth.users 
                WHERE email = NEW.student_email
            )
        ), 'student'
        FROM family_groups fg
        WHERE fg.created_by = NEW.parent_id
        ON CONFLICT (family_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic family member addition
DROP TRIGGER IF EXISTS add_student_to_family_trigger ON parent_students;
CREATE TRIGGER add_student_to_family_trigger
    AFTER UPDATE OF status ON parent_students
    FOR EACH ROW
    EXECUTE FUNCTION add_student_to_family();