/**
 * Where heimerbuild-web's events are ingested: routing data, not the DSN. The DSN itself
 * comes from VITE_SENTRY_DSN at build time; the Worker only forwards to this host and project.
 */
export const SENTRY_INGEST_HOST = "o4510932658159616.ingest.us.sentry.io"
export const SENTRY_PROJECT_ID = "4512166096535553"

/** Same-origin path the Worker forwards to Sentry, so ad-blockers do not drop events. */
export const SENTRY_TUNNEL_PATH = "/monitoring"
