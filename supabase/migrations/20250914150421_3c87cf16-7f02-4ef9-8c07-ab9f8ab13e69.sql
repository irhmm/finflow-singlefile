-- Add RLS policies for public role to view worker_income (read only)
CREATE POLICY "Public can view worker income" 
ON public.worker_income 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'public'
  )
);

-- Add RLS policies for public role to view salary_withdrawals (read only)
CREATE POLICY "Public can view salary withdrawals" 
ON public.salary_withdrawals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'public'
  )
);

-- Update the profiles table constraint to include 'public' role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'super_admin'::text, 'admin_keuangan'::text, 'public'::text]));

-- Update the has_role function to include public role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role::text
  );
$$;