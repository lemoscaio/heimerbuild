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
export function useAnalyticsContext(
	context: AnalyticsContext,
	{ keepAfterUnmount = false }: UseAnalyticsContextOptions = {},
) {
	const key = JSON.stringify(context)
	useEffect(() => {
		const current: AnalyticsContext = JSON.parse(key)
		setAnalyticsContext(current)
		if (keepAfterUnmount) return
		return () => {
			clearAnalyticsContext(Object.keys(current) as (keyof AnalyticsContext)[])
		}
	}, [key, keepAfterUnmount])
}
