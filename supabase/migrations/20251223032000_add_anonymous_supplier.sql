-- Insert Anonymous Vendor if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.creditors WHERE name = 'Anonymous Vendor') THEN
        INSERT INTO public.creditors (name, contact_person, phone, email, address, outstanding_balance)
        VALUES ('Anonymous Vendor', 'Walk-in', NULL, NULL, 'General', 0);
    END IF;
END $$;
