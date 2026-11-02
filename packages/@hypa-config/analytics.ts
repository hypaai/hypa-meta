import analytics from "./json/analytics.json" with { type: "json" };

/**
 * Event names and allowed values for usage analytics. The contract lives in
 * json/analytics.json and apps/hypa-mds/USAGE-ANALYTICS.md; the API and every
 * app import from here instead of hard-coding strings.
 */
export const ANALYTICS = analytics;

export type AnalyticsDimension =
  | "products"
  | "surfaces"
  | "features"
  | "capabilities"
  | "unitTypes"
  | "errorStages"
  | "resultActions";

/**
 * Keeps a client-supplied value only if it is allowed. Unknown values become
 * "other" so a request is never rejected over analytics; missing values stay
 * undefined so the caller can apply a default.
 */
export function normalizeDimension(
  dimension: AnalyticsDimension,
  value: unknown,
): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const clean = value.trim().toLowerCase();

  return (analytics[dimension] as string[]).includes(clean)
    ? clean
    : analytics.defaults.unknown;
}

/** The capability that ran for a developer_request_type, if it has one. */
export function capabilityForRequestType(type: string): string | undefined {
  return (analytics.capabilityByRequestType as Record<string, string>)[type];
}

export type AnalyticsApp = keyof typeof analytics.apps;

export interface AnalyticsRequestOptions {
  /** Only for chained flows, such as speech translation. */
  feature?: string;
  /** One uuid per customer action, shared by every request behind it. */
  workflowId?: string;
  /** The PostHog distinct id while signed out. */
  anonId?: string;
}

/**
 * The request headers a first-party app sends to the API, so its usage is
 * attributed to the right product and surface. The server never rejects a request
 * over these, and sets capability, provider, model and cost itself.
 */
export function analyticsHeaders(
  app: AnalyticsApp,
  appVersion?: string,
  { feature, workflowId, anonId }: AnalyticsRequestOptions = {},
): Record<string, string> {
  const { headers } = analytics;
  const { product, surface } = analytics.apps[app];
  const entries: [string, string | undefined][] = [
    [headers.product, product],
    [headers.surface, surface],
    [headers.appVersion, appVersion],
    [headers.feature, feature],
    [headers.workflowId, workflowId],
    [headers.anonId, anonId],
  ];

  return Object.fromEntries(entries.filter(([, value]) => value)) as Record<string, string>;
}
