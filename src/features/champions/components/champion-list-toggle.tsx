import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type ChampionListToggleProps = {
	expanded: boolean
	onExpandedChange: (expanded: boolean) => void
	/** Id of the list region it shows and hides. */
	controls: string
	/** Known once the champions load. */
	championCount: number | undefined
}

export function ChampionListToggle({
	expanded,
	onExpandedChange,
	controls,
	championCount,
}: ChampionListToggleProps) {
	return (
		<Button
			type="button"
			variant="outline"
			aria-expanded={expanded}
			aria-controls={controls}
			className={cn("h-11 rounded-full bg-transparent px-5.5 font-semibold", {
				"bg-line": expanded,
			})}
			onClick={() => onExpandedChange(!expanded)}
		>
			{expanded && "Hide champions"}
			{!expanded &&
				(championCount === undefined
					? "Browse all champions"
					: `Browse all ${championCount} champions`)}
			{/* Rotating a wrapper, not the SVG, keeps the transform GPU-accelerated. */}
			<span
				aria-hidden="true"
				className={cn(
					"inline-flex transition-transform duration-300 ease-out motion-reduce:transition-none",
					{ "rotate-180": expanded },
				)}
			>
				<ChevronDown />
			</span>
		</Button>
	)
}
