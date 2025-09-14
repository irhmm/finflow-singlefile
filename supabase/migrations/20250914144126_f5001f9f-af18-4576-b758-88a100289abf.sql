-- Update RLS policies for expenses table
DROP POLICY IF EXISTS "Super admin can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can delete expenses" ON public.expenses;

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