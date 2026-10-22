-- Enforce one vocabulary for vertical_slug at the data layer.
--
-- WHY: the lead tables are read across properties (`where vertical_slug = 'wellroost'`,
-- `group by vertical_slug`), so a stray 'aichieve.net' next to 'aichieve' silently splits a report.
-- It is not hypothetical: the first deployed client wrote the hostname with the TLD while
-- vibe_lead_intents stored the bare slug.
--
-- A trigger rather than a CHECK constraint: checking would reject a request for a value the client
-- reasonably believed; canonicalising accepts it and stores the correct thing. The front end sends
-- the bare slug anyway (src/lib/telemetry/vibeClient.ts), this is the belt to that braces.

create or replace function public.canonical_vertical_slug()
returns trigger
language plpgsql
as $$
begin
	new.vertical_slug := lower(split_part(coalesce(nullif(trim(new.vertical_slug), ''), 'aichieve'), '.', 1));
	return new;
end;
$$;

comment on function public.canonical_vertical_slug() is
	'Canonicalises vertical_slug to the bare property slug: aichieve.net -> aichieve, wellroost.com -> wellroost.';

drop trigger if exists canonical_vertical_slug on public.aichieve_lead_intents;
create trigger canonical_vertical_slug
	before insert or update of vertical_slug on public.aichieve_lead_intents
	for each row execute function public.canonical_vertical_slug();
