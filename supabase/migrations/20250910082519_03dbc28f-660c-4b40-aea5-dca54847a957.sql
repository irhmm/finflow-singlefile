-- Enable Row Level Security (RLS) on all financial tables
ALTER TABLE public.admin_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access since this is a financial management app
-- without user authentication (adjust these policies based on your security requirements)

-- Admin income policies
CREATE POLICY "Allow all operations on admin_income" ON public.admin_income
    FOR ALL USING (true) WITH CHECK (true);

-- Worker income policies  
CREATE POLICY "Allow all operations on worker_income" ON public.worker_income
    FOR ALL USING (true) WITH CHECK (true);

-- Expenses policies
CREATE POLICY "Allow all operations on expenses" ON public.expenses
    FOR ALL USING (true) WITH CHECK (true);