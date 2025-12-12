-- Create admin_target_settings table for storing monthly targets per admin
CREATE TABLE public.admin_target_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_code VARCHAR NOT NULL,
  target_omset NUMERIC NOT NULL DEFAULT 0,
  month VARCHAR NOT NULL,
  year INTEGER NOT NULL,
  bonus_80_percent NUMERIC NOT NULL DEFAULT 3,
  bonus_100_percent NUMERIC NOT NULL DEFAULT 4,
  bonus_150_percent NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_code, month, year)
);

-- Create admin_salary_history table for storing calculated salary records
CREATE TABLE public.admin_salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_code VARCHAR NOT NULL,
  month VARCHAR NOT NULL,
  year INTEGER NOT NULL,
  target_omset NUMERIC NOT NULL DEFAULT 0,
  actual_income NUMERIC NOT NULL DEFAULT 0,
  achievement_percent NUMERIC NOT NULL DEFAULT 0,
  bonus_percent NUMERIC NOT NULL DEFAULT 0,
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_code, month, year)
);

-- Enable RLS on both tables
ALTER TABLE public.admin_target_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_salary_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_target_settings (super_admin only)
CREATE POLICY "Super admin can view admin target settings"
ON public.admin_target_settings FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert admin target settings"
ON public.admin_target_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update admin target settings"
ON public.admin_target_settings FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete admin target settings"
ON public.admin_target_settings FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for admin_salary_history (super_admin only)
CREATE POLICY "Super admin can view admin salary history"
ON public.admin_salary_history FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert admin salary history"
ON public.admin_salary_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update admin salary history"
ON public.admin_salary_history FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete admin salary history"
ON public.admin_salary_history FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at on admin_target_settings
CREATE TRIGGER update_admin_target_settings_updated_at
BEFORE UPDATE ON public.admin_target_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on admin_salary_history
CREATE TRIGGER update_admin_salary_history_updated_at
BEFORE UPDATE ON public.admin_salary_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();