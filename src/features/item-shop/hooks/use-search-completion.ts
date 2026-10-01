/**
 * Puts text in the search as if it were typed, so the combobox treats it like typing: it opens
 * the suggestions and highlights the first one. Setting the controlled value would keep a stale
 * highlight, and Base UI has no prop to move it.
 */
export function useSearchCompletion(
	inputRef: React.RefObject<HTMLInputElement | null>,
) {
	function complete(text: string) {
		const input = inputRef.current
		if (!input) return
		// React only sees the change if the value is set through the native setter.
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set?.call(input, text)
		input.dispatchEvent(
			new InputEvent("input", {
				bubbles: true,
				inputType: "insertText",
				data: text,
			}),
		)
	}

	return { complete }
}
