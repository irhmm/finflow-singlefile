-- Drop all RLS policies from admin_income table
DROP POLICY IF EXISTS "Admin can view admin_income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can manage admin_income" ON public.admin_income;

-- Drop all RLS policies from expenses table
DROP POLICY IF EXISTS "Admin can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can manage expenses" ON public.expenses;

-- Drop all RLS policies from profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop all RLS policies from worker_income table
DROP POLICY IF EXISTS "Super admin can manage worker_income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can view worker_income" ON public.worker_income;
DROP POLICY IF EXISTS "Public can view worker_income" ON public.worker_income;

-- Disable RLS on all tables
ALTER TABLE public.admin_income DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_income DISABLE ROW LEVEL SECURITY;

-- Drop RLS-related functions
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Drop auth trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();