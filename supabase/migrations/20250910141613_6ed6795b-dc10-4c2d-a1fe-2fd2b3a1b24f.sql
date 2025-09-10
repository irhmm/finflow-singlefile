-- Update worker_income RLS policy to require authentication
DROP POLICY "Allow public access to worker_income" ON public.worker_income;
CREATE POLICY "Require authentication for worker_income" ON public.worker_income
    FOR ALL USING (auth.role() = 'authenticated');

-- Update admin_income RLS policy to require authentication  
DROP POLICY "Allow public access to admin_income" ON public.admin_income;
CREATE POLICY "Require authentication for admin_income" ON public.admin_income
    FOR ALL USING (auth.role() = 'authenticated');

-- Update expenses RLS policy to require authentication
DROP POLICY "Allow public access to expenses" ON public.expenses;
CREATE POLICY "Require authentication for expenses" ON public.expenses
    FOR ALL USING (auth.role() = 'authenticated');