import type { AbilitySlot, ChampionSpell } from "@schemas/champion"
import { RotateCcw } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { MAX_LEVEL } from "@/lib/stats/growth"
import type { SkillPoint } from "../lib/skill-history"
import { orderCellVariants, SkillOrderCell } from "./skill-order-cell"

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1)

type SkillOrderStripProps = {
	points: readonly SkillPoint[]
	keptPicks: readonly AbilitySlot[]
	spells: readonly ChampionSpell[]
	/** Whether any point is picked, kept ones included: otherwise there is nothing to reset. */
	hasPicks: boolean
	canPlace: (pointLevel: number, slot: AbilitySlot) => boolean
	onPlace: (pointLevel: number, slot: AbilitySlot) => void
	onReset: () => void
}

/** The point of each level 1 to 18: picked, automatic, kept above the level, or not reached. */
export function SkillOrderStrip({
	points,
	keptPicks,
	spells,
	hasPicks,
	canPlace,
	onPlace,
	onReset,
}: SkillOrderStripProps) {
	const labelId = useId()

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<span id={labelId} className="text-subtle text-xs">
					Order
				</span>
				<Button
					type="button"
					variant="link"
					size="xs"
					className="h-auto px-0 text-lilac"
					disabled={!hasPicks}
					onClick={onReset}
				>
					Reset to auto
				</Button>
			</div>
			<ol aria-labelledby={labelId} className="grid grid-cols-9 gap-1">
				{LEVELS.map((level) => {
					const point = points[level - 1]
					const kept = keptPicks[level - points.length - 1]
					return (
						<li key={level}>
							{point ? (
								<SkillOrderCell
									level={level}
									point={point}
									spells={spells}
									canPlace={(slot) => canPlace(level, slot)}
									onPlace={(slot) => onPlace(level, slot)}
								/>
							) : kept ? (
								<KeptCell level={level} slot={kept} />
							) : (
								<span className={orderCellVariants({ state: "future" })}>
									<span className="sr-only">Level </span>
									{level}
								</span>
							)}
						</li>
					)
				})}
			</ol>
		</div>
	)
}

function KeptCell({ level, slot }: { level: number; slot: AbilitySlot }) {
	return (
		<span className={orderCellVariants({ state: "kept" })}>
			<span className="sr-only">
				Level {level}: {slot}, kept for when the level goes back up
			</span>
			<span aria-hidden="true" className="flex items-center gap-0.5">
				{slot}
				<RotateCcw className="size-2.5" />
			</span>
		</span>
	)
}
