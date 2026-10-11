import { cva } from "class-variance-authority"
import { GameIcon } from "@/components/common/game-icon"
import { SkillGridCell } from "./skill-grid-cell"
import { SkillLevelCells } from "./skill-level-cells"
import type { SkillOrderGridProps } from "./skill-order-grid"

/** One column per point target (four abilities, or Aphelios's three stats), after the level label. */
const headerVariants = cva("grid gap-1.5", {
	variants: {
		columns: {
			3: "grid-cols-[3rem_repeat(3,1fr)]",
			4: "grid-cols-[3rem_repeat(4,1fr)]",
		},
	},
})

const cellsVariants = cva("grid gap-1.5", {
	variants: {
		columns: { 3: "grid-cols-3", 4: "grid-cols-4" },
	},
})

/** The skill order grid turned for phones: a row per reached or kept level with a large button per target. */
export function SkillOrderList({
	spells,
	levels,
	ranks,
	canPlace,
	onPlace,
	onRemove,
}: SkillOrderGridProps) {
	const rows = levels.filter((point) => point.state !== "future")
	const columns = spells.length === 3 ? 3 : 4

	return (
		<div className="flex flex-col gap-1.5">
			<div className={headerVariants({ columns })}>
				<span aria-hidden="true" />
				{spells.map((spell) => (
					<div key={spell.slot} className="flex flex-col items-center gap-0.5">
						<GameIcon
							src={spell.icon}
							name={spell.name}
							className="size-8 rounded-md"
						/>
						<span className="text-[11px] text-subtle">
							{ranks[spell.slot]}/{spell.maxRank}
						</span>
					</div>
				))}
			</div>
			{rows.map((point) => (
				<div
					key={point.level}
					className="grid grid-cols-[3rem_1fr] items-center gap-1.5"
				>
					<span className="font-bold font-display text-sm">
						Lv {point.level}
					</span>
					<SkillLevelCells
						point={point}
						onPlace={(slot) => onPlace(point.level, slot)}
						onRemove={() => onRemove(point.level)}
						className={cellsVariants({ columns })}
					>
						{spells.map((spell) => (
							<SkillGridCell
								key={spell.slot}
								spell={spell}
								point={point}
								canPlace={canPlace(point.level, spell.slot)}
								size="large"
							>
								{spell.tag}
							</SkillGridCell>
						))}
					</SkillLevelCells>
				</div>
			))}
		</div>
	)
}
