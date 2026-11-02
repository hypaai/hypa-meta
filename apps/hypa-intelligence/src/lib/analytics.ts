import posthog from "posthog-js";
import { createAnalytics } from "@hypa/config/analytics-client";

/** Product analytics: app opens and who the signed-in person is. */
export const analytics = createAnalytics(posthog, {
  app: "hypa-intelligence",
  appVersion: __APP_VERSION__,
  environment: import.meta.env.PROD ? "production" : "development",
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST,
  session: sessionStorage,
});
