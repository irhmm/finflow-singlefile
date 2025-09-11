-- First, let's check and update the app_role enum to include 'admin' if not present
DO $$ 
BEGIN
    -- Add 'admin' to app_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE public.app_role ADD VALUE 'admin';
    END IF;
END $$;

-- Update admin_income policies to be more explicit about admin role
DROP POLICY IF EXISTS "Admin and super admin can view admin income" ON public.admin_income;
CREATE POLICY "Admin and super admin can view admin income" 
ON public.admin_income 
FOR SELECT 
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Ensure worker_income is accessible to admin users (it's already public but let's be explicit)
DROP POLICY IF EXISTS "Public can view worker income" ON public.worker_income;
CREATE POLICY "Admin, super admin and public can view worker income" 
ON public.worker_income 
FOR SELECT 
USING (true);

-- Update user_roles policies to allow admin users to manage roles appropriately
DROP POLICY IF EXISTS "Super admin can insert user roles" ON public.user_roles;
CREATE POLICY "Super admin can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role) AND 
    role = ANY(ARRAY['user'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

DROP POLICY IF EXISTS "Super admin can update user roles" ON public.user_roles;
CREATE POLICY "Super admin can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) AND 
    role = ANY(ARRAY['user'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);