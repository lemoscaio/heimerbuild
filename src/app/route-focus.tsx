import { useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

/**
 * After a client navigation to another page, moves focus to the page's `h1` (or its `main`),
 * so keyboard and screen reader users start on the new page instead of the document body.
 */
export function RouteFocus() {
	const router = useRouter()

	useEffect(
		() =>
			router.subscribe("onRendered", ({ fromLocation, pathChanged }) => {
				if (fromLocation && pathChanged) focusPageStart()
			}),
		[router],
	)

	return null
}

function focusPageStart() {
	const target =
		document.querySelector<HTMLElement>("main h1") ??
		document.querySelector<HTMLElement>("main")
	if (!target) return
	if (!target.hasAttribute("tabindex")) target.tabIndex = -1
	target.dataset.routeFocus = ""
	target.focus({ preventScroll: true })
}
