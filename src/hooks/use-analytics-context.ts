import { useEffect } from "react"
import { setAnalyticsContext } from "@/lib/analytics/analytics"
import type { AnalyticsContext } from "@/lib/analytics/analytics-events"

/** Keeps a piece of the active view on every analytics event while it is shown. */
export function useAnalyticsContext(context: AnalyticsContext) {
	const key = JSON.stringify(context)
	useEffect(() => {
		setAnalyticsContext(JSON.parse(key))
	}, [key])
}
