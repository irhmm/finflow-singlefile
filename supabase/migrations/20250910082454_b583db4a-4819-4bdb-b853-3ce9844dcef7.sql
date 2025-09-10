-- Enable real-time updates for all financial tables
-- Set replica identity to full for complete row data during updates
ALTER TABLE public.admin_income REPLICA IDENTITY FULL;
ALTER TABLE public.worker_income REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;