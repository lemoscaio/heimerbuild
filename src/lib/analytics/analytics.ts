import type {
	AnalyticsContext,
	AnalyticsEvent,
	AnalyticsEvents,
} from "./analytics-events"

export type FeatureFlagValue = boolean | string | undefined

/** The slice of the PostHog client the app uses, so the SDK itself can load lazily. */
export type AnalyticsClient = {
	capture: (event: string, properties: Record<string, unknown>) => void
	/** Super properties: sent with every later event. */
	register: (properties: Record<string, unknown>) => void
	/** Stops sending a super property. */
	unregister: (property: string) => void
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
	let context: AnalyticsContext = {}

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
			// The view when the event happened, not when the client finally loads.
			queue.push({ event, properties: { ...context, ...properties } })
		}
	}

	/** Merges the active view into every later event (PostHog `register`), queued ones included. */
	function setAnalyticsContext(properties: AnalyticsContext) {
		context = { ...context, ...properties }
		client?.register(properties)
	}

	/** Starts queueing events, then sends them once the client loads. A failed load drops them. */
	async function connect(loadClient: () => Promise<AnalyticsClient>) {
		queue = []
		try {
			const loaded = await loadClient()
			client = loaded
			loaded.register(context)
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

	/** Drops parts of the view from later events (PostHog `unregister`), for views that are no longer shown. */
	function clearAnalyticsContext(
		properties: readonly (keyof AnalyticsContext)[],
	) {
		const next = { ...context }
		for (const property of properties) {
			delete next[property]
			client?.unregister(property)
		}
		context = next
	}

	return {
		track,
		setAnalyticsContext,
		clearAnalyticsContext,
		connect,
		getFeatureFlag,
		subscribeToFeatureFlags,
	}
}

export const {
	track,
	setAnalyticsContext,
	clearAnalyticsContext,
	connect: connectAnalytics,
	getFeatureFlag,
	subscribeToFeatureFlags,
} = createAnalytics()
