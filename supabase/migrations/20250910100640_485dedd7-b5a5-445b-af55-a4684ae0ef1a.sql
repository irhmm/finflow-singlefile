-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create simpler policies without recursion
CREATE POLICY "Enable read access for all users" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authentication users only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);