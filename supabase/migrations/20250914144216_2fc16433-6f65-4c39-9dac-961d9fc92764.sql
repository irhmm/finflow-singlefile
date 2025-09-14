-- Update RLS policies for salary_withdrawals table
DROP POLICY IF EXISTS "Admin and super admin can view salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin and super admin can insert salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin and super admin can update salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin and super admin can delete salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can view salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can insert salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can update salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can delete salary withdrawals" ON public.salary_withdrawals;

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