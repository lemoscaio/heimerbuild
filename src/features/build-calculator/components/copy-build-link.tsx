import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { useCopyLink } from "../hooks/use-copy-link"

type CopyBuildLinkProps = {
	/** Path and search of the build, resolved against the current origin on click. */
	href: string
	/** Called after the link reached the clipboard. */
	onCopied?: () => void
	/** `inline`: a compact button with its messages beside it, for the page's action bar. */
	layout?: "stacked" | "inline"
}

export function CopyBuildLink({
	href,
	onCopied,
	layout = "stacked",
}: CopyBuildLinkProps) {
	const isInline = layout === "inline"
	const copy = useCopyLink({ onCopied })

	function handleCopy() {
		copy.mutate(new URL(href, window.location.origin).href)
	}

	return (
		<div
			className={cn("flex flex-col gap-1", {
				"flex-row-reverse items-center gap-2.5": isInline,
			})}
		>
			<Button
				type="button"
				size="lg"
				className={cn("w-full max-lg:h-11", { "w-auto px-4": isInline })}
				onClick={handleCopy}
			>
				Copy link
			</Button>
			<span
				role="status"
				className={cn("text-center text-success text-xs empty:hidden", {
					"text-white": copy.isError,
				})}
			>
				{copy.isSuccess && "Link copied"}
				{copy.isError && "Could not copy. Select the link."}
			</span>
			{copy.isError && (
				<Input
					className="h-7 w-full min-w-56 border-none text-xs md:text-xs"
					aria-label="Build link"
					readOnly
					value={copy.variables}
					onFocus={(event) => event.currentTarget.select()}
				/>
			)}
		</div>
	)
}
