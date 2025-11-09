-- Create worker_monthly_status table
CREATE TABLE IF NOT EXISTS public.worker_monthly_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name VARCHAR(255) NOT NULL,
  month VARCHAR(7) NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'proses' CHECK (status IN ('done', 'proses')),
  total_income NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_name, month)
);

-- Create indexes for faster queries
CREATE INDEX idx_worker_monthly_status_worker ON public.worker_monthly_status(worker_name);
CREATE INDEX idx_worker_monthly_status_month ON public.worker_monthly_status(month);
CREATE INDEX idx_worker_monthly_status_year ON public.worker_monthly_status(year);

-- Enable RLS
ALTER TABLE public.worker_monthly_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can view worker monthly status"
ON public.worker_monthly_status FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'admin_keuangan'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admin can insert worker monthly status"
ON public.worker_monthly_status FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'admin_keuangan'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admin can update worker monthly status"
ON public.worker_monthly_status FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'admin_keuangan'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admin can delete worker monthly status"
ON public.worker_monthly_status FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'admin_keuangan'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Trigger to update updated_at
CREATE TRIGGER update_worker_monthly_status_updated_at
  BEFORE UPDATE ON public.worker_monthly_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();