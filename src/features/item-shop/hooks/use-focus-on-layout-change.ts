import { useEffect, useEffectEvent, useRef } from "react"
import { isFocusLost } from "@/lib/focus-lost"

type LayoutFocusTargets<Layout extends string> = Record<
	Layout,
	React.RefObject<HTMLElement | null>
>

/**
 * The switch between layouts unmounts the button that was pressed: focus the first control
 * of the new layout's target instead of leaving it on the page.
 */
export function useFocusOnLayoutChange<Layout extends string>(
	layout: Layout,
	targets: LayoutFocusTargets<Layout>,
) {
	const previousLayout = useRef(layout)
	const focusTarget = useEffectEvent((next: Layout) => {
		targets[next].current
			?.querySelector<HTMLElement>("input, button, [tabindex]")
			?.focus()
	})

	useEffect(() => {
		if (previousLayout.current === layout) return
		previousLayout.current = layout
		if (isFocusLost()) focusTarget(layout)
	}, [layout])
}
