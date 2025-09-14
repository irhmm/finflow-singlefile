-- Update RLS policies for admin_income table
DROP POLICY IF EXISTS "Admin and super admin can view admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can insert admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can update admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Super admin can delete admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can view admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can insert admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can update admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can delete admin income" ON public.admin_income;

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