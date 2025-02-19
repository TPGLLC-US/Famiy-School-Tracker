/*
  # Add user roles constraints and triggers

  1. Changes
    - Add NOT NULL constraint to user_roles.user_id
    - Add trigger to automatically create user role on auth.users insert
    - Add trigger to clean up user role on auth.users delete
  
  2. Security
    - Maintain RLS policies
    - Ensure referential integrity
*/

-- Add NOT NULL constraint if not exists
ALTER TABLE user_roles 
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion() 
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create trigger for deleted users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();