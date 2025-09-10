-- Create RLS policies to allow public access to financial data
-- This allows anyone to read, insert, update, and delete data from the financial tables

-- Policies for admin_income table
CREATE POLICY "Allow public access to admin_income" 
ON public.admin_income 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Policies for worker_income table  
CREATE POLICY "Allow public access to worker_income"
ON public.worker_income
FOR ALL
USING (true)
WITH CHECK (true);

-- Policies for expenses table
CREATE POLICY "Allow public access to expenses"
ON public.expenses
FOR ALL  
USING (true)
WITH CHECK (true);