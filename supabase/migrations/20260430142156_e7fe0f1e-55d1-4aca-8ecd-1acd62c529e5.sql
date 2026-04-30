DO $$
BEGIN
  -- Set REPLICA IDENTITY FULL untuk capture data lengkap saat update/delete
  EXECUTE 'ALTER TABLE public.salary_withdrawals REPLICA IDENTITY FULL';
  EXECUTE 'ALTER TABLE public.worker_income REPLICA IDENTITY FULL';

  -- Tambahkan ke publication realtime jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'salary_withdrawals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_withdrawals';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'worker_income'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_income';
  END IF;
END $$;