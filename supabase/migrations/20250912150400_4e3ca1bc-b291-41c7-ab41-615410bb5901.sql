-- Create salary_withdrawals table
CREATE TABLE public.salary_withdrawals (
  id SERIAL PRIMARY KEY,
  worker VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  tanggal TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  catatan TEXT
);

-- Enable Row Level Security
ALTER TABLE public.salary_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies for salary_withdrawals
CREATE POLICY "Super admin can view salary withdrawals" 
ON public.salary_withdrawals 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert salary withdrawals" 
ON public.salary_withdrawals 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update salary withdrawals" 
ON public.salary_withdrawals 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete salary withdrawals" 
ON public.salary_withdrawals 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_salary_withdrawals_updated_at
BEFORE UPDATE ON public.salary_withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();