-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to get current user's highest role
CREATE OR REPLACE FUNCTION public.get_current_user_highest_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'super_admin') THEN 'super_admin'
    WHEN public.has_role(auth.uid(), 'admin') THEN 'admin'
    ELSE 'user'
  END
$$;

-- Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role = 'super_admin' THEN 'super_admin'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
    ELSE 'user'::app_role
  END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop existing policies for all tables
DROP POLICY IF EXISTS "Anyone can view worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can insert worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can update worker income" ON public.worker_income;
DROP POLICY IF EXISTS "Admin can delete worker income" ON public.worker_income;

DROP POLICY IF EXISTS "Admin can view admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin can insert admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin can update admin income" ON public.admin_income;
DROP POLICY IF EXISTS "Admin can delete admin income" ON public.admin_income;

DROP POLICY IF EXISTS "Admin can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can delete expenses" ON public.expenses;

DROP POLICY IF EXISTS "Admin can view workers" ON public.workers;
DROP POLICY IF EXISTS "Admin can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Admin can update workers" ON public.workers;
DROP POLICY IF EXISTS "Admin can delete workers" ON public.workers;

-- Create new RLS policies for worker_income
CREATE POLICY "Public can view worker income"
ON public.worker_income
FOR SELECT
USING (true);

CREATE POLICY "Super admin can insert worker income"
ON public.worker_income
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update worker income"
ON public.worker_income
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can delete worker income"
ON public.worker_income
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create new RLS policies for admin_income
CREATE POLICY "Admin and super admin can view admin income"
ON public.admin_income
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Super admin can insert admin income"
ON public.admin_income
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update admin income"
ON public.admin_income
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can delete admin income"
ON public.admin_income
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create new RLS policies for expenses
CREATE POLICY "Super admin can view expenses"
ON public.expenses
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update expenses"
ON public.expenses
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can delete expenses"
ON public.expenses
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create new RLS policies for workers
CREATE POLICY "Super admin can view workers"
ON public.workers
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can insert workers"
ON public.workers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update workers"
ON public.workers
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can delete workers"
ON public.workers
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super admin can manage roles, but cannot create admin roles
CREATE POLICY "Super admin can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') AND
  role IN ('user', 'super_admin')
);

CREATE POLICY "Super admin can update user roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin') AND
  role IN ('user', 'super_admin')
);

CREATE POLICY "Super admin can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));