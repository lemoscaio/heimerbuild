import type { Rune } from "@schemas/rune"
import { useId, useState } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
	createTooltipHandle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import type { RuneSummonerHint } from "@/lib/summoner-rune-interactions"
import {
	RUNE_ROW_GAP_CLASSES,
	RUNE_SIZE_CLASSES,
	type RuneSize,
} from "../lib/rune-styles"

type RuneRowProps = {
	/** Accessible name of the row, such as "Sorcery keystone". */
	label: string
	runes: readonly Rune[]
	value: number | undefined
	onValueChange: (runeId: number) => void
	/** Hover or focus on a rune: the page shows its details. */
	onDescribe: (rune: Rune) => void
	/** Runes that react to the chosen summoner spells, by rune id: a badge and a tooltip each. */
	summonerHints?: ReadonlyMap<number, RuneSummonerHint>
	size?: RuneSize
	className?: string
}

/** One row of the rune page: pick one rune (radio group, arrow keys move). */
export function RuneRow({
	label,
	runes,
	value,
	onValueChange,
	onDescribe,
	summonerHints,
	size = "rune",
	className,
}: RuneRowProps) {
	const id = useId()
	const [tooltip] = useState(createTooltipHandle<string>)

	return (
		<RadioGroup
			aria-label={label}
			value={value ?? null}
			onValueChange={(runeId) => {
				if (runeId !== null) onValueChange(runeId)
			}}
			className={cn(RUNE_ROW_GAP_CLASSES[size], className)}
		>
			{runes.map((rune) => {
				const hint = summonerHints?.get(rune.id)
				return (
					// Every rune is a trigger, enabled only with a hint, so a new hint never remounts it.
					<TooltipTrigger
						key={rune.id}
						handle={tooltip}
						payload={hint?.text}
						disabled={!hint}
						render={
							<RadioGroupItem
								value={rune.id}
								aria-label={rune.name}
								aria-describedby={
									hint
										? `${id}-${rune.id} ${id}-${rune.id}-hint`
										: `${id}-${rune.id}`
								}
								onPointerEnter={() => onDescribe(rune)}
								onFocus={() => onDescribe(rune)}
								className={cn(
									"group/rune relative shrink-0 rounded-full border-2 border-line p-0.5 opacity-55 transition hover:opacity-90 data-checked:border-(--tree) data-checked:opacity-100",
									RUNE_SIZE_CLASSES[size],
								)}
							/>
						}
					>
						<GameIcon
							src={rune.icon}
							name={rune.name}
							className="size-full rounded-full bg-surface-sunken grayscale group-data-checked/rune:grayscale-0"
						/>
						<span id={`${id}-${rune.id}`} hidden>
							{rune.description}
						</span>
						{hint && (
							<>
								<span id={`${id}-${rune.id}-hint`} hidden>
									{hint.text}
								</span>
								<SummonerBadge hint={hint} />
							</>
						)}
					</TooltipTrigger>
				)
			})}
			<Tooltip handle={tooltip}>
				{({ payload }) => <TooltipContent>{payload}</TooltipContent>}
			</Tooltip>
		</RadioGroup>
	)
}

/** The chosen spells a rune reacts to, over its bottom-right edge: it never takes space in the row. */
function SummonerBadge({ hint }: { hint: RuneSummonerHint }) {
	return (
		<span
			aria-hidden="true"
			className="absolute -right-2 -bottom-1.5 flex gap-px rounded-md border border-gold bg-surface-sunken p-px"
		>
			{hint.spells.map((spell) => (
				<GameIcon
					key={spell.id}
					src={spell.icon}
					name={spell.name}
					className="size-3.5 rounded-sm"
				/>
			))}
		</span>
	)
}
