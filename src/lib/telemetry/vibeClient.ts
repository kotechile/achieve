/**
 * Client-side Telemetry Dispatcher for AIChieve.net Enterprise Micro-Assets.
 * Connects directly to Supabase PostgREST and n8n enterprise webhooks.
 * Fails gracefully and silently in local/offline modes.
 */
import type { AichieveEventName, AichieveTelemetryEvent, AichieveLeadIntent } from './types';

const SUPABASE_URL = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.PUBLIC_SUPABASE_URL || '') : '';
const SUPABASE_ANON_KEY = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '') : '';
const N8N_WEBHOOK_URL = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.PUBLIC_N8N_WEBHOOK_URL || '') : '';

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getAichieveSessionId(): string {
  if (typeof window === 'undefined') {
    return 'ssr_session';
  }

  try {
    const existing = window.sessionStorage.getItem('aichieve_session_id');
    if (existing) return existing;

    const newId = generateSessionId();
    window.sessionStorage.setItem('aichieve_session_id', newId);
    return newId;
  } catch {
    return generateSessionId();
  }
}

/**
 * Streams interaction events from enterprise micro-assets to Supabase / n8n.
 */
export async function trackAichieveEvent(
  eventName: AichieveEventName,
  assetSlug: string,
  domainCategory: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  const event: AichieveTelemetryEvent = {
    sessionId: getAichieveSessionId(),
    assetSlug,
    domainCategory,
    eventName,
    payload,
    clientTimestamp: new Date().toISOString()
  };

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      fetch(`${SUPABASE_URL}/rest/v1/aichieve_telemetry_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          session_id: event.sessionId,
          asset_slug: event.assetSlug,
          domain_category: event.domainCategory,
          event_name: event.eventName,
          payload: event.payload
        }),
        keepalive: true
      }).catch(() => {});
    } catch {
      // Non-blocking telemetry
    }
  }

  if (N8N_WEBHOOK_URL) {
    try {
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: 'aichieve.net', type: 'telemetry_event', event }),
        keepalive: true
      }).catch(() => {});
    } catch {
      // Non-blocking telemetry
    }
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.debug('[AIChieve Telemetry]', event.eventName, { assetSlug, domainCategory, payload });
  }
}

/**
 * Captures high-intent enterprise decision captures.
 */
export async function captureAichieveLead(
  email: string,
  assetSlug: string,
  domainCategory: string,
  calculatedMetrics: Record<string, unknown> = {},
  intentType: 'enterprise_dossier' | 'audit_request' | 'benchmark_sync' = 'enterprise_dossier'
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const leadPayload: AichieveLeadIntent = {
    sessionId: getAichieveSessionId(),
    assetSlug,
    domainCategory,
    email,
    intentType,
    calculatedMetrics
  };

  let success = false;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/aichieve_lead_intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          session_id: leadPayload.sessionId,
          asset_slug: leadPayload.assetSlug,
          domain_category: leadPayload.domainCategory,
          email: leadPayload.email,
          intent_type: leadPayload.intentType,
          calculated_metrics: leadPayload.calculatedMetrics,
          status: 'pending_n8n_sync'
        })
      });
      if (res.ok) success = true;
    } catch (err) {
      console.warn('[AIChieve Telemetry] Supabase capture error:', err);
    }
  }

  if (N8N_WEBHOOK_URL) {
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: 'aichieve.net', type: 'lead_intent', lead: leadPayload })
      });
      if (res.ok) success = true;
    } catch (err) {
      console.warn('[AIChieve Telemetry] n8n capture error:', err);
    }
  }

  if (!SUPABASE_URL && !N8N_WEBHOOK_URL) {
    console.info('[AIChieve Mock Lead Capture]', leadPayload);
    success = true;
  }

  await trackAichieveEvent('lead_engaged', assetSlug, domainCategory, {
    intentType,
    hasMetrics: Object.keys(calculatedMetrics).length > 0
  });

  return success;
}
