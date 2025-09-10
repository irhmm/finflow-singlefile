-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Superadmins can view all profiles
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', COALESCE(NEW.raw_user_meta_data->>'role', 'user'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert superadmin user (this will be handled manually after user creation)
-- We'll create the auth user through the application

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for existing tables to include role-based access
-- Superadmins can do everything, users can only read
CREATE POLICY "Superadmins can manage admin_income"
ON public.admin_income
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Users can view admin_income"
ON public.admin_income
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('user', 'superadmin')
  )
);

CREATE POLICY "Superadmins can manage worker_income"
ON public.worker_income
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Users can view worker_income"
ON public.worker_income
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('user', 'superadmin')
  )
);

CREATE POLICY "Superadmins can manage expenses"
ON public.expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Users can view expenses"
ON public.expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('user', 'superadmin')
  )
);

-- Drop the old "allow all" policies
DROP POLICY IF EXISTS "Allow all operations on admin_income" ON public.admin_income;
DROP POLICY IF EXISTS "Allow all operations on worker_income" ON public.worker_income;
DROP POLICY IF EXISTS "Allow all operations on expenses" ON public.expenses;