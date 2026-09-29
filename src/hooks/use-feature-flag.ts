import { useSyncExternalStore } from "react"
import {
	type FeatureFlagValue,
	getFeatureFlag,
	subscribeToFeatureFlags,
} from "@/lib/analytics/analytics"

/** Flag keys defined in PostHog. Add a key here (`"new-shop" | ...`) before reading it. */
export type FeatureFlag = never

/**
 * A PostHog feature flag or experiment variant, re-rendering when flags load or change.
 * `undefined` while PostHog loads, when analytics is off (dev, E2E) and for unknown flags.
 */
export function useFeatureFlag(name: FeatureFlag): FeatureFlagValue {
	return useSyncExternalStore(
		subscribeToFeatureFlags,
		() => getFeatureFlag(name),
		() => undefined,
	)
}
