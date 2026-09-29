import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "../services/copy-to-clipboard"

const FEEDBACK_MS = 2500

type CopyStatus = "idle" | "copied" | "failed"

type CopyBuildLinkProps = {
	/** Path and search of the build, resolved against the current origin on click. */
	href: string
	/** Called after the link reached the clipboard. */
	onCopied?: () => void
	/** `inline`: a compact button with its messages beside it, for the page's action bar. */
	layout?: "stacked" | "inline"
	className?: string
}

export function CopyBuildLink({
	href,
	onCopied,
	layout = "stacked",
	className,
}: CopyBuildLinkProps) {
	const isInline = layout === "inline"
	const [status, setStatus] = useState<CopyStatus>("idle")
	const [copiedUrl, setCopiedUrl] = useState("")

	async function handleClick() {
		const url = new URL(href, window.location.origin).href
		setCopiedUrl(url)
		const copied = await copyToClipboard(url)
		setStatus(copied ? "copied" : "failed")
		if (copied) {
			onCopied?.()
			setTimeout(() => setStatus("idle"), FEEDBACK_MS)
		}
	}

	return (
		<div
			className={cn(
				"flex flex-col gap-1",
				{ "flex-row-reverse items-center gap-2.5": isInline },
				className,
			)}
		>
			<Button
				type="button"
				size="lg"
				className={cn("w-full max-lg:h-11", { "w-auto px-4": isInline })}
				onClick={handleClick}
			>
				Copy link
			</Button>
			<span
				role="status"
				className={cn("text-center text-success text-xs empty:hidden", {
					"text-white": status === "failed",
				})}
			>
				{status === "copied" && "Link copied"}
				{status === "failed" && "Could not copy. Select the link."}
			</span>
			{status === "failed" && (
				<Input
					className="h-7 w-full min-w-56 border-none bg-primary-2 text-xs md:text-xs"
					aria-label="Build link"
					readOnly
					value={copiedUrl}
					onFocus={(event) => event.currentTarget.select()}
				/>
			)}
		</div>
	)
}
