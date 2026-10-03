import {
	ABILITY_SLOTS,
	type AbilitySlot,
	type ChampionSpell,
} from "@schemas/champion"
import { RotateCcw } from "lucide-react"
import { useId } from "react"
import type { LevelPoint, RemoveBlocker } from "../lib/skill-history"
import { orderCellVariants, SkillOrderCell } from "./skill-order-cell"

type SkillOrderStripProps = {
	levels: readonly LevelPoint[]
	spells: readonly ChampionSpell[]
	canPlace: (pointLevel: number, slot: AbilitySlot) => boolean
	onPlace: (pointLevel: number, slot: AbilitySlot) => void
	removeBlocker: (pointLevel: number) => RemoveBlocker | undefined
	onRemove: (pointLevel: number) => void
	/** The order's actions, next to its label. */
	children?: React.ReactNode
}

/** The point of each level 1 to 18: spent (changed or removed when pressed), unspent (chosen when pressed), kept above the level, or not reached. */
export function SkillOrderStrip({
	levels,
	spells,
	canPlace,
	onPlace,
	removeBlocker,
	onRemove,
	children,
}: SkillOrderStripProps) {
	const labelId = useId()

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<span id={labelId} className="text-subtle text-xs">
					Order
				</span>
				{children}
			</div>
			<ol aria-labelledby={labelId} className="grid grid-cols-9 gap-1">
				{levels.map((point) => (
					<li key={point.level}>
						<StripLevel
							point={point}
							spells={spells}
							canPlace={(slot) => canPlace(point.level, slot)}
							onPlace={(slot) => onPlace(point.level, slot)}
							removeBlocker={removeBlocker(point.level)}
							onRemove={() => onRemove(point.level)}
						/>
					</li>
				))}
			</ol>
		</div>
	)
}

type StripLevelProps = Omit<
	React.ComponentProps<typeof SkillOrderCell>,
	"point"
> & { point: LevelPoint }

function StripLevel({ point, ...props }: StripLevelProps) {
	switch (point.state) {
		case "spent":
			return <SkillOrderCell point={point} {...props} />
		case "free":
			return ABILITY_SLOTS.some((slot) => props.canPlace(slot)) ? (
				<SkillOrderCell point={point} {...props} />
			) : (
				<span className={orderCellVariants({ state: "unspent" })}>
					<span className="sr-only">Level </span>
					{point.level}
					<span className="sr-only">: point to spend</span>
				</span>
			)
		case "kept":
			return (
				<span className={orderCellVariants({ state: "kept" })}>
					<span className="sr-only">
						Level {point.level}: {point.slot}, kept for when the level goes back
						up
					</span>
					<span aria-hidden="true" className="flex items-center gap-0.5">
						{point.slot}
						<RotateCcw className="size-2.5" />
					</span>
				</span>
			)
		case "future":
			return (
				<span className={orderCellVariants({ state: "future" })}>
					<span className="sr-only">Level </span>
					{point.level}
				</span>
			)
	}
}
