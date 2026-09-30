import { useRef } from "react"
import { track } from "@/lib/analytics/analytics"

const LEVEL_TRACK_DELAY_MS = 800

/**
 * Returns `trackLevel`, which sends `level_changed` for the level the user settles on:
 * sliders and steppers change the level on every tick.
 */
export function useLevelTracking(level: number) {
	const trackedLevel = useRef(level)
	const trackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

	function trackLevel(nextLevel: number) {
		clearTimeout(trackTimeout.current)
		trackTimeout.current = setTimeout(() => {
			if (nextLevel !== trackedLevel.current) {
				trackedLevel.current = nextLevel
				track("level_changed", { level: nextLevel })
			}
		}, LEVEL_TRACK_DELAY_MS)
	}

	return trackLevel
}
