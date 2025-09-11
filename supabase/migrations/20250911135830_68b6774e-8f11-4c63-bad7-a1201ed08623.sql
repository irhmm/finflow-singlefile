-- Fix remaining functions to have proper search_path for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_report()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;