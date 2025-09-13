-- Fix missing user role assignments
-- Insert super_admin role for the current user who has it in profiles but not in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles 
WHERE role IN ('super_admin', 'admin') 
AND id NOT IN (SELECT user_id FROM public.user_roles);

-- Update the has_role function to also check profiles table as fallback
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;