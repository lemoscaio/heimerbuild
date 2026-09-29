/** PostHog cloud region of the project; every host below derives from it. The key comes from VITE_POSTHOG_KEY. */
const POSTHOG_REGION: "us" | "eu" = "us"

/** Same-origin path the Worker forwards to PostHog, so ad-blockers do not drop events. */
export const POSTHOG_PROXY_PATH = "/ingest"

/** Events, flags and every other API call. */
export const POSTHOG_API_HOST = `${POSTHOG_REGION}.i.posthog.com`

/** Scripts and remote config: the proxy's `/static/*` and `/array/*` paths. */
export const POSTHOG_ASSET_HOST = `${POSTHOG_REGION}-assets.i.posthog.com`

export const POSTHOG_UI_HOST = `https://${POSTHOG_REGION}.posthog.com`
