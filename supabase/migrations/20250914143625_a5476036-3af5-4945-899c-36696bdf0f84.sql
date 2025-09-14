-- Add admin_keuangan to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'admin_keuangan';

-- Update RLS policies for worker_income table
DROP POLICY IF EXISTS "Admin and super admin can view worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin and super admin can insert worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin and super admin can update worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin and super admin can delete worker income" ON public.worker_income;

CREATE POLICY "Admin, admin_keuangan and super admin can view worker income" 
ON public.worker_income 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin, admin_keuangan and super admin can insert worker income" 
ON public.worker_income 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin, admin_keuangan and super admin can update worker income" 
ON public.worker_income 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin, admin_keuangan and super admin can delete worker income" 
ON public.worker_income 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update RLS policies for admin_income table
DROP POLICY IF EXISTS "Admin and super admin can view admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can insert admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can update admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can delete admin income" ON public.admin_income;

CREATE POLICY "Admin_keuangan and super admin can view admin income" 
ON public.admin_income 
FOR SELECT 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can insert admin income" 
ON public.admin_income 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can update admin income" 
ON public.admin_income 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can delete admin income" 
ON public.admin_income 
FOR DELETE 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update RLS policies for expenses table
DROP POLICY IF EXISTS "Super admin can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can delete expenses" ON public.expenses;

CREATE POLICY "Admin_keuangan and super admin can view expenses" 
ON public.expenses 
FOR SELECT 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update RLS policies for salary_withdrawals table
DROP POLICY IF EXISTS "Admin and super admin can view salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin and super admin can insert salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin and super admin can update salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin and super admin can delete salary withdrawals" ON public.salary_withdrawals;

CREATE POLICY "Admin, admin_keuangan and super admin can view salary withdrawals" 
ON public.salary_withdrawals 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin, admin_keuangan and super admin can insert salary withdrawals" 
ON public.salary_withdrawals 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin, admin_keuangan and super admin can update salary withdrawals" 
ON public.salary_withdrawals 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin, admin_keuangan and super admin can delete salary withdrawals" 
ON public.salary_withdrawals 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update RLS policies for workers table
DROP POLICY IF EXISTS "Super admin can view workers" ON public.workers;
DROP POLICY IF EXISTS "Super admin can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Super admin can update workers" ON public.workers;
DROP POLICY IF EXISTS "Super admin can delete workers" ON public.workers;

CREATE POLICY "Admin_keuangan and super admin can view workers" 
ON public.workers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can insert workers" 
ON public.workers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can update workers" 
ON public.workers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin_keuangan and super admin can delete workers" 
ON public.workers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin_keuangan'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));