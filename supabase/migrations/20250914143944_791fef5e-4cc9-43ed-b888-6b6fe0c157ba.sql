-- Update RLS policies for worker_income table
DROP POLICY IF EXISTS "Admin and super admin can view worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin and super admin can insert worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin and super admin can update worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin and super admin can delete worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can view worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can insert worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can update worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin, admin_keuangan and super admin can delete worker income" ON public.worker_income;

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