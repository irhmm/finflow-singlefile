-- Add public read-only access to worker_income table
-- This allows anyone to view worker income data without authentication

CREATE POLICY "Public can view worker_income" ON public.worker_income
    FOR SELECT USING (true);