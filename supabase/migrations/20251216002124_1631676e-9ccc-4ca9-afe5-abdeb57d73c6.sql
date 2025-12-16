-- Create admins table
CREATE TABLE public.admins (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  gaji_pokok NUMERIC NOT NULL DEFAULT 0,
  no_rek VARCHAR(50),
  nomor VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Super admin only
CREATE POLICY "Super admin can view admins"
ON public.admins FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert admins"
ON public.admins FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update admins"
ON public.admins FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete admins"
ON public.admins FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();