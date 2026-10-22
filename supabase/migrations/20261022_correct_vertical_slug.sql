-- Step 2 of 2: correct the mislabelling from 20261022_align_aichieve_telemetry.sql.
--
-- THE MODEL, now that it is stated once:
--
--   vertical_slug    = the PROPERTY that owns the row        (aichieve.net, giniloh.com, wellroost.com)
--   domain_category  = what the asset is ABOUT                (agentic-ai, gpu-infrastructure, ...)
--
-- `vibe_lead_intents` and `vibe_asset_sessions` only ever needed the first. Aichieve needs both, and
-- previously stored only the second — under a name (`domain_category`) that step 1 then overwrote with
-- the first, which would have permanently destroyed the taxonomy had the column held production data.
--
-- So: put `domain_category` back, and ADD `vertical_slug` beside it. Both lead tables now carry the
-- property under one name, which is what the n8n pipeline and any cross-property query need, while
-- aichieve keeps its own topic dimension.
--
-- `vertical_slug` defaults to 'aichieve' so inserts written before this change keep working rather
-- than failing NOT NULL; new writes in src/lib/telemetry/vibeClient.ts set it explicitly.

alter table public.aichieve_lead_intents     rename column vertical_slug to domain_category;
alter table public.aichieve_asset_sessions   rename column vertical_slug to domain_category;
alter table public.aichieve_telemetry_events rename column vertical_slug to domain_category;

alter table public.aichieve_lead_intents   add column if not exists vertical_slug text not null default 'aichieve';
alter table public.aichieve_asset_sessions add column if not exists vertical_slug text not null default 'aichieve';

comment on column public.aichieve_lead_intents.vertical_slug is
	'Property the lead belongs to (aichieve.net). Mirrors vibe_lead_intents.vertical_slug so one column name means one thing across properties.';

comment on column public.aichieve_lead_intents.domain_category is
	'Topic taxonomy of the asset (agentic-ai, gpu-infrastructure, ...). Aichieve-specific; NOT the property. Do not conflate with vertical_slug.';
