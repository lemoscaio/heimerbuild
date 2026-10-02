import { isTypingTarget } from "@/lib/is-typing-target"

type ShortcutKeyEvent = Pick<
	KeyboardEvent,
	"key" | "altKey" | "ctrlKey" | "metaKey" | "defaultPrevented"
> & { target: Parameters<typeof isTypingTarget>[0] }

/**
 * `/` pressed outside a text field, without Ctrl, Alt or Meta.
 * Shift is allowed: some layouts need it to type `/`.
 */
export function isSearchShortcut(event: ShortcutKeyEvent) {
	if (event.key !== "/" || event.defaultPrevented) return false
	if (event.altKey || event.ctrlKey || event.metaKey) return false
	return !isTypingTarget(event.target)
}
