-- Add 'admin' to app_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE public.app_role ADD VALUE 'admin';
    END IF;
END $$;

-- Check if admin_income policies are working correctly 
-- The existing policy should already allow admin role access

-- Make sure we have the correct policies for user_roles management
DO $$
BEGIN
    -- Update user_roles insert policy to include admin role
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Super admin can insert user roles') THEN
        DROP POLICY "Super admin can insert user roles" ON public.user_roles;
    END IF;
    
    CREATE POLICY "Super admin can insert user roles" 
    ON public.user_roles 
    FOR INSERT 
    WITH CHECK (
        public.has_role(auth.uid(), 'super_admin'::app_role) AND 
        role = ANY(ARRAY['user'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );

    -- Update user_roles update policy to include admin role  
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Super admin can update user roles') THEN
        DROP POLICY "Super admin can update user roles" ON public.user_roles;
    END IF;
    
    CREATE POLICY "Super admin can update user roles" 
    ON public.user_roles 
    FOR UPDATE 
    USING (
        public.has_role(auth.uid(), 'super_admin'::app_role) AND 
        role = ANY(ARRAY['user'::app_role, 'admin'::app_role, 'super_admin'::app_role])
    );
END $$;