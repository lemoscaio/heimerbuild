import { useMutation } from "@tanstack/react-query"
import { copyToClipboard } from "../services/copy-to-clipboard"

const FEEDBACK_MS = 2500

type UseCopyLinkOptions = {
	/** Called after the link reached the clipboard. */
	onCopied?: () => void
}

/** Copies a link; a success clears itself after a moment, a failure stays so the link can be selected. */
export function useCopyLink({ onCopied }: UseCopyLinkOptions = {}) {
	const copy = useMutation({
		mutationFn: async (url: string) => {
			if (!(await copyToClipboard(url))) throw new Error("Could not copy")
		},
		onSuccess: () => {
			onCopied?.()
			setTimeout(() => copy.reset(), FEEDBACK_MS)
		},
	})
	return copy
}
