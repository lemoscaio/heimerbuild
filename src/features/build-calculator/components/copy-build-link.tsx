import { useState } from "react"
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
		<div className="copy-build-link">
			<button
				type="button"
				className="load-button copy-build-link__button"
				onClick={handleClick}
			>
				Copy link
			</button>
			<span
				role="status"
				className={
					status === "failed"
						? "copy-build-link__status copy-build-link__status--failed"
						: "copy-build-link__status"
				}
			>
				{status === "copied" && "Link copied"}
				{status === "failed" && "Could not copy. Select the link below."}
			</span>
			{status === "failed" && (
				<input
					className="copy-build-link__fallback"
					aria-label="Build link"
					readOnly
					value={copiedUrl}
					onFocus={(event) => event.currentTarget.select()}
				/>
			)}
		</div>
	)
}
