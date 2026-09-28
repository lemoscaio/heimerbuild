/** Public DSN of the heimerbuild-web Sentry project; safe to ship in the bundle. */
export const SENTRY_DSN =
	"https://0e35843974ded2f4eb5778740e640d05@o4510932658159616.ingest.us.sentry.io/4512166096535553"

/** Same-origin path the Worker forwards to Sentry, so ad-blockers do not drop events. */
export const SENTRY_TUNNEL_PATH = "/monitoring"
