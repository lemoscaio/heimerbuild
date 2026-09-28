import { useState } from "react"
import { cn } from "@/lib/cn"
import { iconLabel } from "@/lib/icon-label"

type GameIconProps = {
	/** Shown in the tile while the icon loads or when it fails (Data Dragon down). */
	name: string
} & Omit<React.ComponentProps<"img">, "alt">

/** A decorative Data Dragon icon in a fixed-size tile (set it with `className`) that shows the name until the image loads. */
export function GameIcon({
	name,
	src,
	className,
	onLoad,
	...props
}: GameIconProps) {
	const [loadedSrc, setLoadedSrc] = useState<string>()
	const isLoaded = !!src && loadedSrc === src

	return (
		<span
			className={cn(
				"@container relative flex shrink-0 items-center justify-center overflow-hidden bg-primary-2",
				className,
			)}
		>
			{!isLoaded && (
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
				className={cn("absolute inset-0 size-full", { "opacity-0": !isLoaded })}
				onLoad={(event) => {
					setLoadedSrc(src)
					onLoad?.(event)
				}}
				{...props}
			/>
		</span>
	)
}
