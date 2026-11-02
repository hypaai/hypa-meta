import { ANALYTICS, type AnalyticsApp } from "./analytics.ts";

/** The parts of posthog-js that Hypa uses, so this module needs no dependency. */
export interface PostHogLike {
  init(key: string, options: Record<string, unknown>): unknown;
  register(properties: Record<string, unknown>): void;
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string): void;
  reset(): void;
  get_distinct_id(): string;
}

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AnalyticsClientConfig {
  app: AnalyticsApp;
  appVersion?: string;
  /** "production" for a live build, anything else is kept out of the dashboards. */
  environment: string;
  /** The project API key. With none, every method does nothing. */
  key?: string;
  host?: string;
  /** Used to send app_opened once per browser session, not on every reload. */
  session?: SessionStorageLike;
}

/**
 * Settings that keep the free-tier quota and the privacy promise: no autocapture,
 * no session replay, no profiles for people who never sign in. Page views and the
 * app lifecycle stay on; page-leave and web-vitals events do not.
 */
export const POSTHOG_WEB_OPTIONS = {
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: "history_change",
  capture_pageleave: false,
  capture_performance: false,
  person_profiles: "identified_only",
  persistence: "localStorage+cookie",
} as const;

const URL_VALUE = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Drops the query string and fragment from every URL in an event. Sign-in
 * callbacks put the access token in the URL, and PostHog records the page URL
 * on every event, so it must never be sent.
 */
export function scrubUrls<T extends Record<string, unknown> | undefined>(properties: T): T {
  if (!properties) return properties;

  return Object.fromEntries(
    Object.entries(properties).map(([name, value]) => [
      name,
      typeof value === "string" && URL_VALUE.test(value) ? value.split(/[?#]/)[0] : value,
    ]),
  ) as T;
}

/** posthog-js before_send hook that applies scrubUrls to everything an event carries. */
export const scrubEvent = <E extends { properties?: Record<string, unknown>; $set?: Record<string, unknown>; $set_once?: Record<string, unknown> }>(
  event: E | null,
): E | null =>
  event && {
    ...event,
    properties: scrubUrls(event.properties),
    $set: scrubUrls(event.$set),
    $set_once: scrubUrls(event.$set_once),
  };

const SESSION_KEY = "hypa.analytics.app_opened";

/**
 * Wraps a PostHog client for one Hypa app: starts it, tags every event with the
 * app's product, surface and version, sends app_opened, keeps the PostHog person
 * in step with the signed-in user, and exposes the device id for signed-out
 * requests.
 */
export function createAnalytics(
  posthog: PostHogLike,
  { app, appVersion, environment, key, host, session }: AnalyticsClientConfig,
) {
  const enabled = Boolean(key);
  let userId: string | null = null;
  const used = new Set<string>();

  return {
    enabled,

    start() {
      if (!enabled) return;
      const { product, surface } = ANALYTICS.apps[app];

      posthog.init(key as string, {
        ...POSTHOG_WEB_OPTIONS,
        before_send: scrubEvent,
        api_host: host ?? "https://us.i.posthog.com",
        loaded: (client: PostHogLike) => {
          client.register({ product, surface, app_version: appVersion, environment });
          if (session?.getItem(SESSION_KEY)) return;
          session?.setItem(SESSION_KEY, "1");
          client.capture(ANALYTICS.events.appOpened);
        },
      });
    },

    /** Reports an app open outside start(), for example a mobile app returning to the foreground. */
    appOpened() {
      if (enabled) posthog.capture(ANALYTICS.events.appOpened);
    },

    /**
     * Call whenever the signed-in user may have changed: with the user id after
     * sign-in, or null after sign-out. Earlier anonymous activity on the device
     * is merged into the user; signing out starts a new anonymous person.
     */
    syncUser(id: string | null | undefined) {
      if (!enabled) return;
      const next = id || null;

      if (next === userId) return;
      if (next) posthog.identify(next);
      else posthog.reset();
      userId = next;
    },

    /**
     * The user did something with a result. Pass the workflow id the request was
     * sent with, so this joins its feature_completed. Each action is sent once per
     * result, however often the button is pressed.
     */
    capture(event: string, properties?: Record<string, unknown>) {
      if (enabled) posthog.capture(event, scrubUrls(properties));
    },

    resultUsed(feature: string, action: string, workflowId: string | null | undefined) {
      if (!enabled || !workflowId || used.has(`${workflowId}:${action}`)) return;
      used.add(`${workflowId}:${action}`);
      posthog.capture(ANALYTICS.events.resultUsed, { feature, action, workflow_id: workflowId });
    },

    /** The device id to send as x-hypa-anon-id while signed out. */
    anonId(): string | undefined {
      return enabled && !userId ? posthog.get_distinct_id() : undefined;
    },
  };
}
