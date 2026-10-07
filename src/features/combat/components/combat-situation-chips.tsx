import { ChevronDown, Plus } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/cn"
import type { MarkerPlace } from "../hooks/use-combat"
import type { CombatSituation } from "../lib/combat-situations"

const PLACES: readonly { place: MarkerPlace; label: string }[] = [
	{ place: "start", label: "Add at the start" },
	{ place: "end", label: "Add at the end" },
]

type CombatSituationChipsProps = {
	situations: readonly CombatSituation[]
	onAdd: (id: string, place: MarkerPlace) => void
	/** The combo has its most entries: nothing more can be added. */
	disabled: boolean
} & React.ComponentProps<"section">

type SituationChipProps = {
	situation: CombatSituation
} & Pick<CombatSituationChipsProps, "onAdd" | "disabled">

/** A split chip: the chip adds the marker at the end, its arrow opens where else it can go. */
function SituationChip({ situation, onAdd, disabled }: SituationChipProps) {
	const { id, label } = situation
	return (
		<div className="flex">
			<Button
				variant="outline"
				size="sm"
				disabled={disabled}
				onClick={() => onAdd(id, "end")}
				aria-label={`Add marker: ${label}`}
				className="rounded-r-none rounded-l-full border-lilac/60 border-r-0 border-dashed max-lg:h-11"
			>
				<Plus aria-hidden="true" />
				{label}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					disabled={disabled}
					render={
						<Button
							variant="outline"
							size="icon-sm"
							aria-label={`Where to put marker: ${label}`}
							className="rounded-r-full rounded-l-none border-lilac/60 border-dashed max-lg:size-11"
						/>
					}
				>
					<ChevronDown aria-hidden="true" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{PLACES.map(({ place, label: placeLabel }) => (
						<DropdownMenuItem key={place} onClick={() => onAdd(id, place)}>
							{placeLabel}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

/**
 * "Situation": one chip per situation the build supports; each adds a marker at the end of the
 * combo, or at the start from its arrow (issue 344).
 */
export function CombatSituationChips({
	situations,
	onAdd,
	disabled,
	className,
	...props
}: CombatSituationChipsProps) {
	const titleId = useId()
	if (!situations.length) return null

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col gap-1", className)}
			{...props}
		>
			<div className="flex flex-wrap items-center gap-1.5">
				<h3 id={titleId} className="font-bold font-display text-sm">
					Situation
				</h3>
				<ul className="flex flex-wrap gap-1.5">
					{situations.map((situation) => (
						<li key={situation.id}>
							<SituationChip
								situation={situation}
								onAdd={onAdd}
								disabled={disabled}
							/>
						</li>
					))}
				</ul>
			</div>
			<p className="text-subtle text-xs">
				A marker goes at the end of the combo, or at the start from its arrow:
				from there on, its situation holds.
			</p>
		</section>
	)
}
