-- Drop existing policies to rebuild with new role system
DROP POLICY IF EXISTS "Admin can view admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin can insert admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin can update admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin can delete admin income" ON public.admin_income;

DROP POLICY IF EXISTS "Anyone can view worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can insert worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can update worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can delete worker income" ON public.worker_income;

DROP POLICY IF EXISTS "Admin can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can delete expenses" ON public.expenses;

DROP POLICY IF EXISTS "Admin can view workers" ON public.workers;
DROP POLICY IF EXISTS "Admin can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Admin can update workers" ON public.workers;
DROP POLICY IF EXISTS "Admin can delete workers" ON public.workers;

-- Create new RLS policies for worker_income (accessible to anonymous, admin, super_admin)
CREATE POLICY "Anyone can view worker income" 
ON public.worker_income 
FOR SELECT 
USING (true);

CREATE POLICY "Super admin can insert worker income" 
ON public.worker_income 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can update worker income" 
ON public.worker_income 
FOR UPDATE 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can delete worker income" 
ON public.worker_income 
FOR DELETE 
USING (get_current_user_role() = 'super_admin');

-- Create new RLS policies for admin_income (accessible to admin and super_admin, read-only for admin)
CREATE POLICY "Admin and super admin can view admin income" 
ON public.admin_income 
FOR SELECT 
USING (get_current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Super admin can insert admin income" 
ON public.admin_income 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can update admin income" 
ON public.admin_income 
FOR UPDATE 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can delete admin income" 
ON public.admin_income 
FOR DELETE 
USING (get_current_user_role() = 'super_admin');

-- Create new RLS policies for expenses (super_admin only)
CREATE POLICY "Super admin can view expenses" 
ON public.expenses 
FOR SELECT 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (get_current_user_role() = 'super_admin');

-- Create new RLS policies for workers (super_admin only)
CREATE POLICY "Super admin can view workers" 
ON public.workers 
FOR SELECT 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can insert workers" 
ON public.workers 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can update workers" 
ON public.workers 
FOR UPDATE 
USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin can delete workers" 
ON public.workers 
FOR DELETE 
USING (get_current_user_role() = 'super_admin');

-- Update profiles table policies for role management
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Super admin can update any profile role" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'super_admin');

-- Update your account to super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'irham06oktober@gmail.com');