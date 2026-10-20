# n8n workflows for the vibe-marketing pipeline

Two files. Both are **generated** by `scripts/build-n8n.mjs` (in the `giniloh` repo) and copied here
verbatim. The same files live in `giniloh`, `AICHIEVE` and `wellroost` because all three applications
point `PUBLIC_N8N_WEBHOOK_URL` at the **same** endpoint on **one** n8n instance:

```
https://n8n.giniloh.com/webhook/vibe-telemetry
```

Do not hand-edit the JSON. Change the generator, re-run it, copy.

## Import order

1. **`vibe_telemetry_workflow.json`** — receives browser events. Import once (importing the copies
   replaces the same path). It must be **Active**: an inactive workflow answers
   `404 "… is not registered"`, which is exactly what production returned before this file existed.
2. **`lead_reports_workflow.json`** — polls the lead tables every five minutes and mails the
   scenario. Import once, attach credentials, then **Active**.

## Credentials — the reason "missing emails" happened

No JSON can carry a credential, so both need attaching after import. A workflow with an unattached
node fails at that node, and that is what an "email workflow" looks like from the outside.

`lead_reports_workflow.json` needs two:

| Credential | Nodes | Value |
| --- | --- | --- |
| HTTP Header Auth | "Fetch Pending …", "Mark Sent …" | `apikey: <service role key>` and `Authorization: Bearer <service role key>`. **Service role**, because this reads and patches rows — the anon key cannot |
| SMTP | "Send Report …" | Your provider account. `From` is derived per row (`reports@<property domain>`) and must be a verified sender |

The telemetry workflow needs **no credentials** — by design. It sends no email.

## Why email is not in the telemetry workflow

The previous file ended in an `emailSend` node reading `$json.email`. A telemetry payload never
carries an address: the front ends send **field names, never values**, and the event that fires is a
`view` / `input_change` / `complete` — not a form submission. The node therefore had no recipient and
no SMTP credential, and failed the whole execution every time it ran.

Addresses live in Supabase (`vibe_lead_intents`, `aichieve_lead_intents`). Mailing is a poll of those
tables, and a failed send leaves `status = 'pending_n8n_sync'` so the next tick retries it.

## What the telemetry workflow does

```
Webhook (POST /vibe-telemetry, CORS *)
  ├─ type == "lead_intent" → shape alert → has email? → "Notify a Human"  (attach Slack/Telegram)
  └─ anything else         → Ignore        (events are already stored by the browser)
```

It deliberately does **not** write to Supabase: the browser already posts every event to
`vibe_asset_telemetry` / `vibe_telemetry_events`. Mirroring here would double every row.

`Notify a Human` is an empty NoOp on purpose — the earlier version pointed at
`hooks.slack.com/services/REPLACE/...`, so an unconfigured alert reported a failed execution for a
successful event.

## Payload shapes

```jsonc
// giniloh.com and aichieve.net front ends
{ "type": "telemetry_event", "event": { "sessionId": "…", "assetSlug": "…", "verticalSlug": "…", "eventName": "view", "payload": {} } }
{ "type": "lead_intent", "lead": { "sessionId": "…", "assetSlug": "…", "verticalSlug": "…", "email": "…", "intentType": "…", "calculatedMetrics": {} } }

// wellroost.com front end (flat)
{ "asset_id": "…", "asset_slug": "…", "event_type": "view", "category": "…", "title": "…", "domain": "wellroost.com", "metadata": { "fields": ["engine"] } }
```

The workflow branches only on `type == "lead_intent"`; wellroost's flat events fall through to
`Ignore`, which is correct — they are already in Supabase.

## Verifying without clicking around

```bash
# 1. Is the path registered? 200/204 = yes; "not registered" = no active workflow owns it.
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://n8n.giniloh.com/webhook/vibe-telemetry -H 'Content-Type: application/json' -d '{}'

# 2. Does the browser preflight pass? Want 204 + Access-Control-Allow-Origin.
curl -s -D - -o /dev/null -X OPTIONS https://n8n.giniloh.com/webhook/vibe-telemetry \
  -H 'Origin: https://wellroost.com' -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' | grep -i access-control

# 3. Anything waiting to be mailed?
#    select count(*) from vibe_lead_intents where status = 'pending_n8n_sync';
```
