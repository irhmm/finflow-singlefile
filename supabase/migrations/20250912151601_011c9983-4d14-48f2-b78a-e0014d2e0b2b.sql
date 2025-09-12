-- Update RLS policies for salary_withdrawals to allow both super_admin and admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Super admin can view salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Super admin can insert salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Super admin can update salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Super admin can delete salary withdrawals" ON public.salary_withdrawals;

-- Create new policies that allow both super_admin and admin access
CREATE POLICY "Admin and super admin can view salary withdrawals"
ON public.salary_withdrawals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin and super admin can insert salary withdrawals"
ON public.salary_withdrawals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin and super admin can update salary withdrawals"
ON public.salary_withdrawals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin and super admin can delete salary withdrawals"
ON public.salary_withdrawals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));