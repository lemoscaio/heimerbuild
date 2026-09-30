/** True when keyboard focus fell back to the page, as when the focused element unmounts. */
export function isFocusLost() {
	const active = document.activeElement
	return !active || active === document.body
}
