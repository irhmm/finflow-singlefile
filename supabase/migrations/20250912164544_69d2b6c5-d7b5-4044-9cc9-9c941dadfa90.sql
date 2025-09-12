-- SECURITY FIX: Prevent users from updating their own role
-- Drop existing policy that allows users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy that prevents role changes by regular users
CREATE POLICY "Users can update their own profile (except role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (OLD.role = NEW.role OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Allow super admins to update any profile including roles
CREATE POLICY "Super admin can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));