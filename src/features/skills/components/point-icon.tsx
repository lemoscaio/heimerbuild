import type { RankStat } from "@schemas/champion"
import { cva } from "class-variance-authority"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { PointSpell } from "../lib/point-spells"

const statLabelVariants = cva(
	"@min-[40px]:block hidden font-bold font-display text-[24cqi] leading-none tracking-tight",
	{
		variants: {
			stat: {
				attackDamage: "text-physical",
				attackSpeedPercent: "text-warning",
				lethality: "text-error",
				other: "text-prose",
			},
		},
	},
)

/** The tile's label colour of each stat Aphelios's points buy. */
function labelStat(stat: RankStat["stat"]) {
	return stat === "attackDamage" ||
		stat === "attackSpeedPercent" ||
		stat === "lethality"
		? stat
		: "other"
}

type PointIconProps = {
	spell: Pick<PointSpell, "icon" | "name" | "statTile">
} & Pick<React.ComponentProps<"span">, "className">

/** A point target's tile: the ability's icon, or the stat Aphelios's point buys. */
export function PointIcon({ spell, className }: PointIconProps) {
	if (!spell.statTile) {
		return <GameIcon src={spell.icon} name={spell.name} className={className} />
	}
	return (
		<StatPointTile
			{...spell.statTile}
			icon={spell.icon}
			className={className}
		/>
	)
}

type StatPointTileProps = {
	stat: RankStat["stat"]
	icon: string
	label: string
} & Pick<React.ComponentProps<"span">, "className">

/**
 * The stat's icon at its own 15 px (scaled up it blurs), with its short label below on tiles of
 * 40 px or more (the grid's rows already name the stat).
 */
function StatPointTile({ stat, icon, label, className }: StatPointTileProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"@container flex shrink-0 flex-col items-center justify-center gap-0.5 bg-surface-sunken",
				className,
			)}
		>
			<img src={icon} alt="" className="size-[15px]" />
			<span className={statLabelVariants({ stat: labelStat(stat) })}>
				{label}
			</span>
		</span>
	)
}
