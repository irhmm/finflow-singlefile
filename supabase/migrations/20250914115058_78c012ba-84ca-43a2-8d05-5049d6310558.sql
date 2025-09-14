-- Update worker_income RLS policies to allow admin CRUD access
DROP POLICY IF EXISTS "Super admin can insert worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Super admin can update worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Super admin can delete worker income" ON public.worker_income;

-- Create new policies allowing both admin and super_admin
CREATE POLICY "Admin and super admin can insert worker income" 
ON public.worker_income 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin and super admin can update worker income" 
ON public.worker_income 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin and super admin can delete worker income" 
ON public.worker_income 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));