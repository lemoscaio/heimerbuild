import { replayIntegration } from "@sentry/react"

/** Loaded on demand from sentry.ts so Replay stays out of the main bundle. */
export function createReplayIntegration() {
	return replayIntegration({ maskAllText: true, blockAllMedia: true })
}
