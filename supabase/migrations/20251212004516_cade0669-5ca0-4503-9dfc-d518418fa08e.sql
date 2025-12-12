-- Create new permanent admin_target_settings table
CREATE TABLE public.admin_target_settings_permanent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_code VARCHAR NOT NULL UNIQUE,
  target_omset NUMERIC NOT NULL DEFAULT 0,
  bonus_80_percent NUMERIC NOT NULL DEFAULT 3,
  bonus_100_percent NUMERIC NOT NULL DEFAULT 4,
  bonus_150_percent NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_target_settings_permanent ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same as before - super_admin only)
CREATE POLICY "Super admin can view admin target settings permanent"
ON public.admin_target_settings_permanent
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert admin target settings permanent"
ON public.admin_target_settings_permanent
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update admin target settings permanent"
ON public.admin_target_settings_permanent
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete admin target settings permanent"
ON public.admin_target_settings_permanent
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Migrate existing data (take latest setting per admin)
INSERT INTO public.admin_target_settings_permanent (admin_code, target_omset, bonus_80_percent, bonus_100_percent, bonus_150_percent, created_at, updated_at)
SELECT DISTINCT ON (admin_code) 
  admin_code, 
  target_omset, 
  bonus_80_percent, 
  bonus_100_percent, 
  bonus_150_percent,
  created_at,
  updated_at
FROM public.admin_target_settings
ORDER BY admin_code, year DESC, month DESC;

-- Drop old table
DROP TABLE public.admin_target_settings;

-- Rename new table to original name
ALTER TABLE public.admin_target_settings_permanent RENAME TO admin_target_settings;

-- Create trigger for updated_at
CREATE TRIGGER update_admin_target_settings_updated_at
BEFORE UPDATE ON public.admin_target_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();