import { cn } from "@/lib/cn"
import { SOURCE_KINDS, SOURCE_LABELS } from "./lib/source-summary"
import { sourceColor } from "./source-colors"

/** The bar colors, and the other form's marker while compared. */
export function SourceLegend({ compared }: { compared?: string }) {
	return (
		<ul
			aria-label="Bar colors"
			className="flex flex-wrap gap-x-3 gap-y-1 text-[0.625rem] text-subtle"
		>
			{SOURCE_KINDS.map((kind) => (
				<li key={kind} className="flex items-center gap-1">
					<span className={cn("size-2 rounded-xs", sourceColor({ kind }))} />
					{SOURCE_LABELS[kind]}
				</li>
			))}
			{compared && (
				<li className="flex items-center gap-1">
					<span className="h-2.5 w-0.5 bg-white" />
					{compared}
				</li>
			)}
		</ul>
	)
}
