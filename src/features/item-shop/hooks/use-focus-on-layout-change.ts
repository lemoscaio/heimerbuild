import { useEffect, useEffectEvent } from "react"
import { isFocusLost } from "@/lib/focus-lost"

type LayoutFocusTargets<Layout extends string> = Record<
	Layout,
	React.RefObject<HTMLElement | null>
>

/**
 * The switch between layouts unmounts the button that was pressed: focus the first control
 * of the new layout's target instead of leaving it on the page. `previousLayout` outlives a
 * remount, since the switch can mount a new shop.
 */
export function useFocusOnLayoutChange<Layout extends string>(
	layout: Layout,
	targets: LayoutFocusTargets<Layout>,
	previousLayout: React.RefObject<Layout | undefined>,
) {
	const focusTarget = useEffectEvent((next: Layout) => {
		targets[next].current
			?.querySelector<HTMLElement>("input, button, [tabindex]")
			?.focus()
	})

	useEffect(() => {
		const previous = previousLayout.current
		previousLayout.current = layout
		if (previous === undefined || previous === layout) return
		if (isFocusLost()) focusTarget(layout)
	}, [layout, previousLayout])
}
