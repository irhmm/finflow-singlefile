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