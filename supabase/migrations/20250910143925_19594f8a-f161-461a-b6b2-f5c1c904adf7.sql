-- First, let's create a helper function to get current user role more efficiently
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies and create new role-based ones

-- Worker Income: Public read access, super admin full access
DROP POLICY IF EXISTS "Require authentication for worker_income" ON public.worker_income;
DROP POLICY IF EXISTS "Authenticated users can access worker_income" ON public.worker_income;

CREATE POLICY "Public can view worker_income" ON public.worker_income
    FOR SELECT USING (true);

CREATE POLICY "Super admin can manage worker_income" ON public.worker_income
    FOR ALL USING (public.get_current_user_role() = 'super_admin');

-- Admin Income: Admin and super admin read access, super admin full access
DROP POLICY IF EXISTS "Require authentication for admin_income" ON public.admin_income;
DROP POLICY IF EXISTS "Authenticated users can access admin_income" ON public.admin_income;

CREATE POLICY "Admin can view admin_income" ON public.admin_income
    FOR SELECT USING (public.get_current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Super admin can manage admin_income" ON public.admin_income
    FOR ALL USING (public.get_current_user_role() = 'super_admin');

-- Expenses: Admin and super admin read access, super admin full access
DROP POLICY IF EXISTS "Require authentication for expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can access expenses" ON public.expenses;

CREATE POLICY "Admin can view expenses" ON public.expenses
    FOR SELECT USING (public.get_current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Super admin can manage expenses" ON public.expenses
    FOR ALL USING (public.get_current_user_role() = 'super_admin');