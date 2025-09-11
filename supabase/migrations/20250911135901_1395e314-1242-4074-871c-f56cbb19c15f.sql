-- Insert admin role for the user who has admin role in profiles but not in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM public.profiles 
WHERE role = 'admin' 
AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role);