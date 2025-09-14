-- Allow anonymous (unauthenticated) users to view worker_income and salary_withdrawals
-- This enables true "public" access without requiring authentication

CREATE POLICY "Anonymous users can view worker income" 
ON public.worker_income 
FOR SELECT 
TO anon
USING (true);

CREATE POLICY "Anonymous users can view salary withdrawals" 
ON public.salary_withdrawals 
FOR SELECT 
TO anon
USING (true);