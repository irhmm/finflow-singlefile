-- Add role column to admins table
ALTER TABLE public.admins ADD COLUMN role VARCHAR(50);