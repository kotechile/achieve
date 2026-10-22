-- Step 1 of 2 (applied 2026-10-22, superseded by 20261022_correct_vertical_slug.sql).
--
-- This step renamed `domain_category` -> `vertical_slug` on the three aichieve tables, added
-- `consent_text_version`, and added the service-role policy.
--
-- The rename was wrong on inspection: aichieve's `domain_category` holds a TOPIC taxonomy
-- ('agentic-ai', 'gpu-infrastructure', 'Compute Infrastructure'), while
-- `vibe_lead_intents.vertical_slug` holds the PROPERTY that owns the row. Two different facts cannot
-- share one column name without telling future readers a lie.
--
-- Kept verbatim because it is what actually ran; read the correction alongside it.

alter table public.aichieve_lead_intents     rename column domain_category to vertical_slug;
alter table public.aichieve_asset_sessions   rename column domain_category to vertical_slug;
alter table public.aichieve_telemetry_events rename column domain_category to vertical_slug;

alter table public.aichieve_lead_intents add column if not exists consent_text_version text;

comment on column public.aichieve_lead_intents.consent_text_version is
	'Version of the consent wording shown when the email was captured. NULL = captured before consent was recorded.';

drop policy if exists "Allow service role full management on aichieve_lead_intents" on public.aichieve_lead_intents;
create policy "Allow service role full management on aichieve_lead_intents"
	on public.aichieve_lead_intents
	for all
	to service_role
	using (true)
	with check (true);
