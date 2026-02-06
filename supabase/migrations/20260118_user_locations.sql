
-- User Locations Table to track sales agents
CREATE TABLE public.user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location Requests Table for Admin -> Sales Agent communication
CREATE TABLE public.location_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    sales_rep_id UUID NOT NULL REFERENCES auth.users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, responded, timeout
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for user_locations
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales reps can insert their own location" 
    ON public.user_locations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins/Managers can view all user locations" 
    ON public.user_locations FOR SELECT 
    USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Sales reps can view their own location history" 
    ON public.user_locations FOR SELECT 
    USING (auth.uid() = user_id);

-- RLS for location_requests
ALTER TABLE public.location_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Managers can create location requests" 
    ON public.location_requests FOR INSERT 
    WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins/Managers can view requests they made or all requests" 
    ON public.location_requests FOR SELECT 
    USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Sales reps can view requests sent to them" 
    ON public.location_requests FOR SELECT 
    USING (auth.uid() = sales_rep_id);

CREATE POLICY "Sales reps can update their requests (mark as responded)" 
    ON public.location_requests FOR UPDATE 
    USING (auth.uid() = sales_rep_id);
