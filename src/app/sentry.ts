import {
	addIntegration,
	init,
	tanstackRouterBrowserTracingIntegration,
} from "@sentry/react"
import { router } from "./router"
import { SENTRY_DSN, SENTRY_TUNNEL_PATH } from "./sentry-config"
import { shouldInitTelemetry } from "./should-init-telemetry"

declare global {
	interface Window {
		/** Non-production builds only: throws an uncaught error to test reporting end to end. */
		__HB_SENTRY_TEST__?: () => void
	}
}

const environment = import.meta.env.APP_ENVIRONMENT

export function initSentry() {
	if (
		!shouldInitTelemetry({
			environment,
			enabledLocally: import.meta.env.VITE_SENTRY_ENABLED === "true",
			isE2e: window.__HB_E2E__ === true,
		})
	) {
		return
	}

	init({
		dsn: SENTRY_DSN,
		// Local servers have no Worker to tunnel through, so they send to Sentry directly.
		tunnel: environment === "development" ? undefined : SENTRY_TUNNEL_PATH,
		environment,
		release: import.meta.env.APP_RELEASE,
		integrations: [tanstackRouterBrowserTracingIntegration(router)],
		tracesSampleRate: environment === "production" ? 0.2 : 1,
		// Matched against the path of same-origin requests only, so no other origin gets trace headers.
		tracePropagationTargets: [/^\//],
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 1,
	})
	// A failed chunk load only costs the replay; errors are still reported.
	import("./sentry-replay")
		.then(({ createReplayIntegration }) =>
			addIntegration(createReplayIntegration()),
		)
		.catch(() => {})

	if (environment !== "production") {
		window.__HB_SENTRY_TEST__ = () => {
			setTimeout(() => {
				throw new Error("Heimerbuild Sentry test error")
			})
		}
	}
}
