/**
 * Telemetry types for AIChieve.net enterprise interactive assets.
 */

export type AichieveEventName =
  | 'card_impression'
  | 'session_start'
  | 'input_adjusted'
  | 'calc_run'
  | 'scenario_selected'
  | 'lead_engaged'
  | 'dossier_exported';

export interface AichieveTelemetryEvent {
  sessionId: string;
  assetSlug: string;
  domainCategory: string;
  eventName: AichieveEventName;
  payload?: Record<string, unknown>;
  clientTimestamp?: string;
}

export interface AichieveLeadIntent {
  sessionId: string;
  assetSlug: string;
  domainCategory: string;
  email: string;
  intentType: 'enterprise_dossier' | 'audit_request' | 'benchmark_sync';
  calculatedMetrics?: Record<string, unknown>;
}
