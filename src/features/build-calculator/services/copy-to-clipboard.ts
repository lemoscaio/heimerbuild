/** Copies text with the Clipboard API, or with a hidden textarea where that API is missing or denied. */
export async function copyToClipboard(text: string) {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return copyWithTextarea(text)
	}
}

function copyWithTextarea(text: string) {
	const textarea = document.createElement("textarea")
	textarea.value = text
	textarea.setAttribute("readonly", "")
	textarea.style.position = "fixed"
	textarea.style.opacity = "0"
	document.body.append(textarea)
	textarea.select()
	try {
		// Deprecated, but the only synchronous fallback on insecure origins and old browsers.
		return document.execCommand("copy")
	} catch {
		return false
	} finally {
		textarea.remove()
	}
}
