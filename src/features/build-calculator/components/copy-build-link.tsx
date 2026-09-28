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
}

export function CopyBuildLink({ href }: CopyBuildLinkProps) {
	const [status, setStatus] = useState<CopyStatus>("idle")
	const [copiedUrl, setCopiedUrl] = useState("")

	async function handleClick() {
		const url = new URL(href, window.location.origin).href
		setCopiedUrl(url)
		const copied = await copyToClipboard(url)
		setStatus(copied ? "copied" : "failed")
		if (copied) {
			setTimeout(() => setStatus("idle"), FEEDBACK_MS)
		}
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<Button type="button" size="lg" onClick={handleClick}>
				Copy link
			</Button>
			<span
				role="status"
				className={cn("min-h-4 text-right text-success text-xs", {
					"text-white": status === "failed",
				})}
			>
				{status === "copied" && "Link copied"}
				{status === "failed" && "Could not copy. Select the link below."}
			</span>
			{status === "failed" && (
				<Input
					className="h-7 w-full max-w-55 border-none bg-primary-2 text-xs md:text-xs"
					aria-label="Build link"
					readOnly
					value={copiedUrl}
					onFocus={(event) => event.currentTarget.select()}
				/>
			)}
		</div>
	)
}
