import { useMediaQuery } from "./use-media-query"

// Tailwind's `lg` breakpoint.
const LG_QUERY = "(min-width: 64rem)"

/** Whether the viewport is at Tailwind's `lg` breakpoint or wider. */
export function useIsDesktop() {
	return useMediaQuery(LG_QUERY)
}
