-- Update RLS policies for workers table
DROP POLICY IF EXISTS "Super admin can view workers" ON public.workers;
DROP POLICY IF EXISTS "Super admin can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Super admin can update workers" ON public.workers;
DROP POLICY IF EXISTS "Super admin can delete workers" ON public.workers;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can view workers" ON public.workers;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can update workers" ON public.workers;
DROP POLICY IF EXISTS "Admin_keuangan and super admin can delete workers" ON public.workers;

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