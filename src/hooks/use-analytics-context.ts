import { useEffect } from "react"
import {
	clearAnalyticsContext,
	setAnalyticsContext,
} from "@/lib/analytics/analytics"
import type { AnalyticsContext } from "@/lib/analytics/analytics-events"

type UseAnalyticsContextOptions = {
	/** Keep sending it after the view unmounts, for saved preferences such as the shop grouping. */
	keepAfterUnmount?: boolean
}

/** Adds a piece of the active view to every analytics event while the view is shown. */
export function useAnalyticsContext<Key extends keyof AnalyticsContext>(
	key: Key,
	value: AnalyticsContext[Key],
	{ keepAfterUnmount = false }: UseAnalyticsContextOptions = {},
) {
	useEffect(() => {
		const context: AnalyticsContext = { [key]: value }
		setAnalyticsContext(context)
		if (keepAfterUnmount) return
		return () => clearAnalyticsContext([key])
	}, [key, value, keepAfterUnmount])
}
