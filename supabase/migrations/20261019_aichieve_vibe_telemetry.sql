-- ==============================================================================
-- AIChieve Enterprise Vibe Marketing & Interactive Telemetry Schema
-- Description: Streams real-time session telemetry, model parameter sweeps,
--              and enterprise lead intents across AIChieve command deck verticals.
-- ==============================================================================

-- 1. Table: aichieve_asset_sessions
CREATE TABLE IF NOT EXISTS public.aichieve_asset_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    asset_slug TEXT NOT NULL,
    domain_category TEXT NOT NULL,
    referrer TEXT,
    user_inputs JSONB DEFAULT '{}'::jsonb,
    calculated_metrics JSONB DEFAULT '{}'::jsonb,
    duration_seconds INTEGER DEFAULT 0,
    is_converted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: aichieve_telemetry_events
CREATE TABLE IF NOT EXISTS public.aichieve_telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    asset_slug TEXT NOT NULL,
    domain_category TEXT NOT NULL,
    event_name TEXT NOT NULL, -- 'card_impression' | 'session_start' | 'input_adjusted' | 'calc_run' | 'lead_engaged'
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table: aichieve_lead_intents
CREATE TABLE IF NOT EXISTS public.aichieve_lead_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    asset_slug TEXT NOT NULL,
    domain_category TEXT NOT NULL,
    email TEXT NOT NULL,
    intent_type TEXT NOT NULL DEFAULT 'enterprise_dossier', -- 'enterprise_dossier' | 'audit_request' | 'benchmark_sync'
    calculated_metrics JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_n8n_sync',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- Indexes for Sub-Second Telemetry & Reporting
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_aichieve_sessions_id ON public.aichieve_asset_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_aichieve_sessions_category ON public.aichieve_asset_sessions(domain_category, asset_slug);
CREATE INDEX IF NOT EXISTS idx_aichieve_events_session ON public.aichieve_telemetry_events(session_id, event_name);
CREATE INDEX IF NOT EXISTS idx_aichieve_events_created ON public.aichieve_telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aichieve_leads_status ON public.aichieve_lead_intents(status, created_at DESC);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.aichieve_asset_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aichieve_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aichieve_lead_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to aichieve_asset_sessions"
    ON public.aichieve_asset_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (session_id IS NOT NULL AND asset_slug IS NOT NULL);

CREATE POLICY "Allow public update own aichieve session"
    ON public.aichieve_asset_sessions
    FOR UPDATE
    TO anon, authenticated
    USING (session_id IS NOT NULL);

CREATE POLICY "Allow public insert to aichieve_telemetry_events"
    ON public.aichieve_telemetry_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (session_id IS NOT NULL AND event_name IS NOT NULL);

CREATE POLICY "Allow public insert to aichieve_lead_intents"
    ON public.aichieve_lead_intents
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE POLICY "Allow service role full management on aichieve tables"
    ON public.aichieve_asset_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
