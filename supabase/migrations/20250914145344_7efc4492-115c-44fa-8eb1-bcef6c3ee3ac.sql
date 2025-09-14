-- Drop the existing check constraint and create a new one that includes admin_keuangan
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'super_admin'::text, 'admin_keuangan'::text]));

-- Now update the user role
UPDATE public.profiles 
SET role = 'admin_keuangan' 
WHERE id = 'd869a741-29f5-4eeb-af37-0947472714d8';