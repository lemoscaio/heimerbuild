import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { useSearchShortcut } from "../hooks/use-search-shortcut"

type ItemSearchProps = {
	query: string
	onQueryChange: (query: string) => void
	/** Escape pressed in the input; the shop clears the search and moves focus to the items. */
	onEscape: () => void
	className?: string
}

export function ItemSearch({
	query,
	onQueryChange,
	onEscape,
	className,
}: ItemSearchProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	useSearchShortcut(inputRef)

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Escape") return
		event.preventDefault()
		onEscape()
	}

	return (
		<div className={cn("relative w-full max-w-xs", className)}>
			<Input
				ref={inputRef}
				type="search"
				placeholder="Search items"
				aria-label="Search items"
				aria-keyshortcuts="/"
				className="border-primary-1 bg-primary-3 pr-8 text-white dark:bg-primary-3"
				value={query}
				onChange={(event) => onQueryChange(event.target.value)}
				onKeyDown={handleKeyDown}
			/>
			{!query && (
				<kbd
					aria-hidden
					className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-sm border border-primary-1 px-1.5 font-mono text-subtle text-xs"
				>
					/
				</kbd>
			)}
		</div>
	)
}
