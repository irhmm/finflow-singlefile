-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create trigger for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', COALESCE(NEW.raw_user_meta_data->>'role', 'user'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies for worker_income (most sensitive)
DROP POLICY IF EXISTS "Allow public access to worker_income" ON public.worker_income;
CREATE POLICY "Authenticated users can access worker_income" ON public.worker_income
    FOR ALL USING (auth.role() = 'authenticated');

-- Update RLS policies for admin_income
DROP POLICY IF EXISTS "Allow public access to admin_income" ON public.admin_income;
CREATE POLICY "Authenticated users can access admin_income" ON public.admin_income
    FOR ALL USING (auth.role() = 'authenticated');

-- Update RLS policies for expenses
DROP POLICY IF EXISTS "Allow public access to expenses" ON public.expenses;
CREATE POLICY "Authenticated users can access expenses" ON public.expenses
    FOR ALL USING (auth.role() = 'authenticated');