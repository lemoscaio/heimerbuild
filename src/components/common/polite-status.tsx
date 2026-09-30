import { useDebouncedValue } from "@/hooks/use-debounced-value"

const SETTLE_DELAY_MS = 500

type PoliteStatusProps = {
	/** Announced once it stops changing, so typing a search is read once, not per key. */
	message: string
}

/** A screen-reader-only polite live region, such as a result count. */
export function PoliteStatus({ message }: PoliteStatusProps) {
	const settledMessage = useDebouncedValue(message, SETTLE_DELAY_MS)

	return (
		<span aria-live="polite" aria-atomic="true" className="sr-only">
			{settledMessage}
		</span>
	)
}
