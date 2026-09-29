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
}

export function CopyBuildLink({ href, onCopied }: CopyBuildLinkProps) {
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
		<div className="flex flex-col gap-1">
			<Button type="button" size="lg" className="w-full" onClick={handleClick}>
				Copy link
			</Button>
			<span
				role="status"
				className={cn("text-center text-success text-xs empty:hidden", {
					"text-white": status === "failed",
				})}
			>
				{status === "copied" && "Link copied"}
				{status === "failed" && "Could not copy. Select the link below."}
			</span>
			{status === "failed" && (
				<Input
					className="h-7 w-full border-none bg-primary-2 text-xs md:text-xs"
					aria-label="Build link"
					readOnly
					value={copiedUrl}
					onFocus={(event) => event.currentTarget.select()}
				/>
			)}
		</div>
	)
}
