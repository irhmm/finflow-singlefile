-- Create RLS policies for public role to read worker_income
CREATE POLICY "Public role can view worker income" 
ON public.worker_income 
FOR SELECT 
USING (has_role(auth.uid(), 'public'::app_role));

-- Create RLS policies for public role to read salary_withdrawals  
CREATE POLICY "Public role can view salary withdrawals" 
ON public.salary_withdrawals 
FOR SELECT 
USING (has_role(auth.uid(), 'public'::app_role));