-- Create report table for daily recap
CREATE TABLE public.report (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL UNIQUE,
  total_admin_income NUMERIC NOT NULL DEFAULT 0,
  total_worker_income NUMERIC NOT NULL DEFAULT 0,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  daily_omset NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report table
ALTER TABLE public.report ENABLE ROW LEVEL SECURITY;

-- Create policies for report table
CREATE POLICY "Super admin can view reports" 
ON public.report 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert reports" 
ON public.report 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update reports" 
ON public.report 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete reports" 
ON public.report 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_report_updated_at
BEFORE UPDATE ON public.report
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update daily report
CREATE OR REPLACE FUNCTION public.update_daily_report()
RETURNS TRIGGER AS $$
DECLARE
  target_date DATE;
  admin_total NUMERIC;
  worker_total NUMERIC;
  expenses_total NUMERIC;
  omset_total NUMERIC;
BEGIN
  -- Determine the date to update based on the trigger operation
  IF TG_OP = 'DELETE' THEN
    target_date := OLD.tanggal;
  ELSE
    target_date := NEW.tanggal;
  END IF;

  -- Calculate total admin income for the date
  SELECT COALESCE(SUM(nominal), 0) INTO admin_total
  FROM public.admin_income
  WHERE tanggal = target_date;

  -- Calculate total worker income for the date
  SELECT COALESCE(SUM(fee), 0) INTO worker_total
  FROM public.worker_income
  WHERE tanggal = target_date;

  -- Calculate total expenses for the date
  SELECT COALESCE(SUM(nominal), 0) INTO expenses_total
  FROM public.expenses
  WHERE tanggal = target_date;

  -- Calculate daily omset
  omset_total := admin_total + worker_total - expenses_total;

  -- Upsert data into report table
  INSERT INTO public.report (tanggal, total_admin_income, total_worker_income, total_expenses, daily_omset)
  VALUES (target_date, admin_total, worker_total, expenses_total, omset_total)
  ON CONFLICT (tanggal) 
  DO UPDATE SET
    total_admin_income = EXCLUDED.total_admin_income,
    total_worker_income = EXCLUDED.total_worker_income,
    total_expenses = EXCLUDED.total_expenses,
    daily_omset = EXCLUDED.daily_omset,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on admin_income table
CREATE TRIGGER trigger_update_daily_report_admin_income
AFTER INSERT OR UPDATE OR DELETE ON public.admin_income
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_report();

-- Create triggers on worker_income table
CREATE TRIGGER trigger_update_daily_report_worker_income
AFTER INSERT OR UPDATE OR DELETE ON public.worker_income
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_report();

-- Create triggers on expenses table
CREATE TRIGGER trigger_update_daily_report_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_report();