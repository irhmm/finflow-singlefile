-- Remove redundant policies for salary_withdrawals
DROP POLICY IF EXISTS "Anonymous users can view salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Public can view salary withdrawals" ON public.salary_withdrawals;
DROP POLICY IF EXISTS "Public role can view salary withdrawals" ON public.salary_withdrawals;

-- Create a single, clear policy for public read access to salary_withdrawals
CREATE POLICY "Public users can view salary withdrawals" 
ON public.salary_withdrawals 
FOR SELECT 
USING (
  -- Allow if user has public role in profiles table
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'public'
  )
  OR
  -- Allow if user has public role in user_roles table
  has_role(auth.uid(), 'public'::app_role)
  OR
  -- Allow for admin roles as well
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'admin_keuangan'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);