type ShortcutTarget = { tagName: string; isContentEditable: boolean }

type ShortcutKeyEvent = Pick<
	KeyboardEvent,
	"key" | "altKey" | "ctrlKey" | "metaKey" | "defaultPrevented"
> & { target: ShortcutTarget | null }

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

/**
 * `/` pressed outside a text field, without Ctrl, Alt or Meta.
 * Shift is allowed: some layouts need it to type `/`.
 */
export function isSearchShortcut(event: ShortcutKeyEvent) {
	if (event.key !== "/" || event.defaultPrevented) return false
	if (event.altKey || event.ctrlKey || event.metaKey) return false
	const { target } = event
	return (
		!target || !(TYPING_TAGS.has(target.tagName) || target.isContentEditable)
	)
}
