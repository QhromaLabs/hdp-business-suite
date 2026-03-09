CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out', 'auto_clock_out')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance_logs
CREATE POLICY "Users can insert their own logs" ON public.attendance_logs
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own logs" ON public.attendance_logs
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all logs" ON public.attendance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );
