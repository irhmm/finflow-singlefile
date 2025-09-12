-- CRITICAL SECURITY FIX: Remove public access to sensitive data

-- Fix 1: Secure profiles table - remove public access to user emails
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy for profiles - users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow super admins to view all profiles for management
CREATE POLICY "Super admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 2: Secure worker_income table - remove public access to financial data
DROP POLICY IF EXISTS "Admin, super admin and public can view worker income" ON public.worker_income;

-- Create restrictive policy for worker_income - only admin and super_admin access
CREATE POLICY "Admin and super admin can view worker income" 
ON public.worker_income 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));