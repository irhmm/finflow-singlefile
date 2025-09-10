-- Fix security vulnerability: Remove public access to worker_income table
-- Worker personal information (names, job details, payment info) should not be publicly accessible

-- Drop the problematic public access policy
DROP POLICY "Public can view worker_income" ON public.worker_income;

-- Create secure policy: Only authenticated users with admin or super_admin roles can view worker_income
CREATE POLICY "Admin can view worker_income" ON public.worker_income
    FOR SELECT USING (public.get_current_user_role() IN ('admin', 'super_admin'));

-- Super admin policy for full access remains unchanged (already exists)
-- This ensures that only authorized personnel can access sensitive worker information