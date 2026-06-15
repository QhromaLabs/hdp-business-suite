-- Create mobile_app_links table
CREATE TABLE IF NOT EXISTS public.mobile_app_links (
    id text PRIMARY KEY,
    link text NOT NULL,
    updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.mobile_app_links ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Allow public read access"
ON public.mobile_app_links
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated insert"
ON public.mobile_app_links
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
ON public.mobile_app_links
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
ON public.mobile_app_links
FOR DELETE
TO authenticated
USING (true);
