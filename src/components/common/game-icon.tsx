import { useState } from "react"
import { cn } from "@/lib/cn"
import { iconLabel } from "@/lib/icon-label"

type GameIconProps = {
	/** Shown in the tile only when the icon fails to load (Data Dragon down). */
	name: string
} & Omit<React.ComponentProps<"img">, "alt">

type LoadResult = { src: string; status: "loaded" | "failed" }

function loadStatus(src: string | undefined, result: LoadResult | undefined) {
	if (!src) return "failed"
	return result?.src === src ? result.status : "loading"
}

/**
 * A decorative Data Dragon icon in a fixed-size tile (set it with `className`): an empty tile
 * while it loads, the name only if it fails.
 */
export function GameIcon({
	name,
	src,
	className,
	onLoad,
	onError,
	...props
}: GameIconProps) {
	const [result, setResult] = useState<LoadResult>()
	const status = loadStatus(src, result)

	return (
		<span
			className={cn(
				"@container relative flex shrink-0 items-center justify-center overflow-hidden bg-primary-2",
				className,
			)}
		>
			{status === "failed" && (
				<span
					aria-hidden="true"
					className="wrap-break-word line-clamp-4 hyphens-auto px-[3cqi] text-center font-bold text-[19cqi] text-prose leading-[1.1] tracking-tight"
				>
					{iconLabel(name)}
				</span>
			)}
			<img
				src={src}
				alt=""
				className={cn("absolute inset-0 size-full", {
					"opacity-0": status !== "loaded",
				})}
				onLoad={(event) => {
					if (src) setResult({ src, status: "loaded" })
					onLoad?.(event)
				}}
				onError={(event) => {
					if (src) setResult({ src, status: "failed" })
					onError?.(event)
				}}
				{...props}
			/>
		</span>
	)
}
