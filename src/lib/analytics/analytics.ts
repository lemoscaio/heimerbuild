import type { AnalyticsEvent, AnalyticsEvents } from "./analytics-events"

export type FeatureFlagValue = boolean | string | undefined

/** The slice of the PostHog client the app uses, so the SDK itself can load lazily. */
export type AnalyticsClient = {
	capture: (event: string, properties: Record<string, unknown>) => void
	getFeatureFlag: (name: string) => FeatureFlagValue
	/** Calls back whenever flags load or change; returns an unsubscribe function. */
	onFeatureFlags: (callback: () => void) => () => void
}

// Enough for the actions of a slow first load; later events are dropped.
const MAX_QUEUED_EVENTS = 50

type QueuedEvent = {
	event: AnalyticsEvent
	properties: Record<string, unknown>
}

export function createAnalytics() {
	let client: AnalyticsClient | undefined
	// Events tracked while the client loads; undefined while analytics is off (dev, E2E).
	let queue: QueuedEvent[] | undefined
	const flagListeners = new Set<() => void>()

	function notifyFlagListeners() {
		for (const listener of flagListeners) listener()
	}

	function track<Event extends AnalyticsEvent>(
		event: Event,
		properties: AnalyticsEvents[Event],
	) {
		if (client) {
			client.capture(event, properties)
		} else if (queue && queue.length < MAX_QUEUED_EVENTS) {
			queue.push({ event, properties })
		}
	}

	/** Starts queueing events, then sends them once the client loads. A failed load drops them. */
	async function connect(loadClient: () => Promise<AnalyticsClient>) {
		queue = []
		try {
			const loaded = await loadClient()
			client = loaded
			for (const { event, properties } of queue) {
				loaded.capture(event, properties)
			}
			loaded.onFeatureFlags(notifyFlagListeners)
			notifyFlagListeners()
		} catch {
			// Analytics is optional: the app keeps working without it.
		} finally {
			queue = undefined
		}
	}

	/** `undefined` until PostHog has loaded the flags, and for unknown flags. */
	function getFeatureFlag(name: string): FeatureFlagValue {
		return client?.getFeatureFlag(name)
	}

	function subscribeToFeatureFlags(listener: () => void) {
		flagListeners.add(listener)
		return () => {
			flagListeners.delete(listener)
		}
	}

	return { track, connect, getFeatureFlag, subscribeToFeatureFlags }
}

export const {
	track,
	connect: connectAnalytics,
	getFeatureFlag,
	subscribeToFeatureFlags,
} = createAnalytics()
