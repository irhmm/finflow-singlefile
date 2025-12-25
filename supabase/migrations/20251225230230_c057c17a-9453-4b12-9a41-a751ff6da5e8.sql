-- Add SELECT permission for admin role on admin_income table
CREATE POLICY "Admin can view admin income (read only)"
ON public.admin_income
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));