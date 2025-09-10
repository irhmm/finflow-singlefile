-- Enable Row Level Security on all tables
ALTER TABLE public.worker_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(role, 'user') FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Policies for worker_income (public can SELECT, admin has full access)
CREATE POLICY "Anyone can view worker income" ON public.worker_income
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert worker income" ON public.worker_income
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can update worker income" ON public.worker_income
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can delete worker income" ON public.worker_income
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Policies for admin_income (admin only)
CREATE POLICY "Admin can view admin income" ON public.admin_income
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can insert admin income" ON public.admin_income
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can update admin income" ON public.admin_income
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can delete admin income" ON public.admin_income
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Policies for expenses (admin only)
CREATE POLICY "Admin can view expenses" ON public.expenses
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can update expenses" ON public.expenses
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can delete expenses" ON public.expenses
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Policies for workers (admin only)
CREATE POLICY "Admin can view workers" ON public.workers
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can insert workers" ON public.workers
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can update workers" ON public.workers
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admin can delete workers" ON public.workers
  FOR DELETE USING (public.get_current_user_role() = 'admin');

-- Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();