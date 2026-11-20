-- Chapter 15 booking MVP: run in the Supabase SQL Editor for your practice project.
-- Client accounts are managed by Supabase Auth. Do not put a secret key in React.

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Keep any older public.appointments table intact but inaccessible to browser roles.
DO $$
BEGIN
    IF to_regclass('public.appointments') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON TABLE public.appointments FROM PUBLIC, anon, authenticated';
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.client_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_hours SMALLINT NOT NULL DEFAULT 1
        CHECK (duration_hours BETWEEN 1 AND 3),
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_appointments_client_date_idx
    ON public.client_appointments (client_id, booking_date, booking_time);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services"
    ON public.services FOR SELECT
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Clients can view their appointments" ON public.client_appointments;
CREATE POLICY "Clients can view their appointments"
    ON public.client_appointments FOR SELECT TO authenticated
    USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can request their own appointments" ON public.client_appointments;
CREATE POLICY "Clients can request their own appointments"
    ON public.client_appointments FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = client_id
        AND status = 'Pending'
        AND booking_date >= CURRENT_DATE
    );

DROP POLICY IF EXISTS "Clients can reschedule pending appointments" ON public.client_appointments;
CREATE POLICY "Clients can reschedule pending appointments"
    ON public.client_appointments FOR UPDATE TO authenticated
    USING (auth.uid() = client_id AND status = 'Pending')
    WITH CHECK (
        auth.uid() = client_id
        AND status = 'Pending'
        AND booking_date >= CURRENT_DATE
    );

DROP POLICY IF EXISTS "Clients can cancel their own appointments" ON public.client_appointments;
CREATE POLICY "Clients can cancel their own appointments"
    ON public.client_appointments FOR DELETE TO authenticated
    USING (auth.uid() = client_id);

REVOKE ALL ON TABLE public.services FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.client_appointments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_appointments TO authenticated;

INSERT INTO public.services (service_name, description)
SELECT seed.service_name, seed.description
FROM (
    VALUES
        ('Divorce', 'Consultation on family law matters and divorce proceedings.'),
        ('Property Transfer', 'Guidance on property transactions and transfer matters.'),
        ('Will Writing', 'Advice on preparing a will and estate-planning documents.'),
        ('Criminal Defence', 'Legal guidance for criminal law matters.'),
        ('Corporate Law', 'Advice for businesses on corporate and commercial matters.')
) AS seed(service_name, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.services existing
    WHERE existing.service_name = seed.service_name
);
