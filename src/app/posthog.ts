import { connectAnalytics } from "@/lib/analytics/analytics"
import {
	POSTHOG_API_HOST,
	POSTHOG_KEY,
	POSTHOG_PROXY_PATH,
	POSTHOG_UI_HOST,
} from "./posthog-config"
import { shouldInitTelemetry } from "./should-init-telemetry"

const environment = import.meta.env.APP_ENVIRONMENT
const release = import.meta.env.APP_RELEASE

/** Loads posthog-js in its own chunk after the first render; events tracked meanwhile are queued. */
export function initPostHog() {
	if (
		!shouldInitTelemetry({
			environment,
			enabledLocally: import.meta.env.VITE_POSTHOG_ENABLED === "true",
			isE2e: window.__HB_E2E__ === true,
		})
	) {
		return
	}

	connectAnalytics(async () => {
		const { posthog } = await import("posthog-js")
		posthog.init(POSTHOG_KEY, {
			// Local servers have no Worker to proxy through, so they send to PostHog directly.
			api_host:
				environment === "development"
					? `https://${POSTHOG_API_HOST}`
					: POSTHOG_PROXY_PATH,
			ui_host: POSTHOG_UI_HOST,
			defaults: "2026-08-30",
			// No cookies, localStorage or sessionStorage until the consent banner exists (#59).
			cookieless_mode: "always",
			person_profiles: "never",
			capture_pageview: "history_change",
			// Autocapture, heatmaps and web vitals follow the project settings.
			// Sentry owns errors and replays.
			disable_session_recording: true,
			capture_exceptions: false,
			loaded: (client) => {
				client.register(release ? { environment, release } : { environment })
			},
		})
		return {
			capture: (event, properties) => {
				posthog.capture(event, properties)
			},
			getFeatureFlag: (name) => posthog.getFeatureFlag(name),
			onFeatureFlags: (callback) => posthog.onFeatureFlags(() => callback()),
		}
	})
}
