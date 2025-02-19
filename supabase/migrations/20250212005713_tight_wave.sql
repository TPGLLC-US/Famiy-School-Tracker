-- Add NOT NULL constraint if not exists
ALTER TABLE user_roles 
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion() 
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for deleted users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();