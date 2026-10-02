import type { ChampionSpell } from "@schemas/champion"
import { cva } from "class-variance-authority"
import { Plus } from "lucide-react"
import { useId, useState } from "react"
import { GameIcon } from "@/components/common/game-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { formatAbilityValue, rankUpChanges } from "../lib/ability-values"
import type { SpendBlocker } from "../lib/skill-history"

const rankPipVariants = cva("h-1.5 flex-1 rounded-full", {
	variants: {
		state: {
			picked: "bg-gold",
			auto: "border border-gold border-dashed",
			empty: "bg-line",
		},
	},
})

type AbilityRankButtonProps = {
	spell: ChampionSpell
	/** The rank at the current level, suggested points included. */
	rank: number
	/** How many of those ranks come from suggested points. */
	autoRanks: number
	/** Why it cannot take one more point; undefined when it can. */
	blocker: SpendBlocker | undefined
	onSpend: () => void
	/** What the next rank changes on the stats panel, when it does. */
	statChanges?: React.ReactNode
}

/** One ability: its icon and rank pips. Pressing it puts one more point in it; the tooltip shows what the next rank changes. */
export function AbilityRankButton({
	spell,
	rank,
	autoRanks,
	blocker,
	onSpend,
	statChanges,
}: AbilityRankButtonProps) {
	const tooltipId = useId()
	const [open, setOpen] = useState(false)
	const canSpend = !blocker

	return (
		<div className="flex flex-col items-center gap-1">
			<Tooltip open={open} onOpenChange={setOpen}>
				<TooltipTrigger
					type="button"
					closeOnClick={false}
					aria-label={`${spell.name} (${spell.slot}), rank ${rank} of ${spell.maxRank}`}
					aria-describedby={open ? tooltipId : undefined}
					aria-disabled={!canSpend}
					className={cn("relative block rounded-lg p-0 outline-offset-2", {
						"cursor-not-allowed": !canSpend,
					})}
					onClick={() => canSpend && onSpend()}
					onPointerUp={(event) => {
						// Base UI tooltips ignore touch; a tap shows what changed.
						if (event.pointerType !== "mouse") setOpen(true)
					}}
				>
					<GameIcon
						src={spell.icon}
						name={spell.name}
						className={cn("size-11 rounded-lg border-2 border-line", {
							"border-gold": canSpend,
						})}
					/>
					<span
						aria-hidden="true"
						className="absolute -bottom-1 -left-1 rounded-sm bg-surface-sunken px-1 font-bold font-display text-[10px] text-white leading-tight"
					>
						{spell.slot}
					</span>
					{canSpend && (
						<span
							aria-hidden="true"
							className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-lilac text-surface-sunken"
						>
							<Plus className="size-3" strokeWidth={3} />
						</span>
					)}
				</TooltipTrigger>
				<TooltipContent id={tooltipId}>
					<RankUpDetails
						spell={spell}
						rank={rank}
						blocker={blocker}
						statChanges={statChanges}
					/>
				</TooltipContent>
			</Tooltip>
			<RankPips maxRank={spell.maxRank} rank={rank} autoRanks={autoRanks} />
		</div>
	)
}

function RankPips({
	maxRank,
	rank,
	autoRanks,
}: {
	maxRank: number
	rank: number
	autoRanks: number
}) {
	return (
		<span aria-hidden="true" className="flex w-11 gap-0.5">
			{Array.from({ length: maxRank }, (_, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: one pip per rank, never reordered
					key={index}
					className={rankPipVariants({
						state:
							index >= rank
								? "empty"
								: index >= rank - autoRanks
									? "auto"
									: "picked",
					})}
				/>
			))}
		</span>
	)
}

function blockerMessage(blocker: SpendBlocker): string {
	switch (blocker.reason) {
		case "max-rank":
			return "Max rank."
		case "all-picked":
			return "Every point up to this level is picked. Raise the level, or change a level in the order."
		case "needs-level":
			return `The next rank needs level ${blocker.level}.`
		case "needs-ability":
			return `Needs a point in ${blocker.abilities.join(" or ")} first.`
		case "no-point":
			return "No point up to this level can move here."
	}
}

/** The game's rank-up tooltip: the values the next rank changes, or why there is none. */
function RankUpDetails({
	spell,
	rank,
	blocker,
	statChanges,
}: Omit<AbilityRankButtonProps, "autoRanks" | "onSpend">) {
	const changes = blocker ? [] : rankUpChanges(spell, rank)

	return (
		<div className="flex w-60 flex-col gap-1.5">
			<p className="flex items-baseline justify-between gap-2">
				<span className="font-bold text-sm">{spell.name}</span>
				<span className="text-subtle">
					{blocker
						? `Rank ${rank}/${spell.maxRank}`
						: `Rank ${rank} → ${rank + 1}`}
				</span>
			</p>
			{blocker ? (
				<p className="text-prose">{blockerMessage(blocker)}</p>
			) : (
				<>
					{!!changes.length && (
						<ul className="flex flex-col gap-0.5">
							{changes.map(({ label, unit, from, to }) => (
								<li key={label} className="flex justify-between gap-2">
									<span className="text-prose">{label}</span>
									<span className="tabular-nums">
										{from !== undefined && (
											<>
												{formatAbilityValue(from, unit)}
												<span aria-hidden="true"> → </span>
												<span className="sr-only"> becomes </span>
											</>
										)}
										<span className="font-bold text-success">
											{formatAbilityValue(to, unit)}
										</span>
									</span>
								</li>
							))}
						</ul>
					)}
					{statChanges}
					<p className="text-subtle">Press to put the next point here.</p>
				</>
			)}
		</div>
	)
}
