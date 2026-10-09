import { cn } from "@/lib/cn"
import { SOURCE_KINDS, SOURCE_LABELS } from "../lib/source-summary"
import { sourceColor } from "./source-colors"

type SourceLegendProps = {
	/** The compared form's name, while compared: its total's marker joins the legend. */
	comparedName?: string
}

/** The bar colors, and the other form's marker while compared. */
export function SourceLegend({ comparedName }: SourceLegendProps) {
	return (
		<ul
			aria-label="Source colors"
			className="flex flex-wrap gap-x-3 gap-y-1 text-[0.625rem] text-subtle"
		>
			{SOURCE_KINDS.map((kind) => (
				<li key={kind} className="flex items-center gap-1">
					<span className={cn("size-2 rounded-xs", sourceColor({ kind }))} />
					{SOURCE_LABELS[kind]}
				</li>
			))}
			{comparedName && (
				<li className="flex items-center gap-1">
					<span className="h-2.5 w-0.5 bg-white" />
					{comparedName}
				</li>
			)}
		</ul>
	)
}
