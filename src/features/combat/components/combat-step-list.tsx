import type { ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { NumberField } from "@/components/ui/number-field"
import type { CombatAction } from "@/lib/combat/combat"
import type { CombatListItem, CombatStepItem } from "../hooks/use-combat-view"
import { useStepReorder } from "../hooks/use-step-reorder"
import { actionLabel } from "../lib/combat-format"
import { WAIT_SECONDS } from "../lib/combat-sequence"
import { outcomeChoice } from "../lib/combat-view"
import { CombatActionIcon } from "./combat-action-icon"
import { CombatMarkerLine } from "./combat-marker-line"
import { CombatOutcomeChips } from "./combat-outcome-chips"
import { CombatOutcomeChoices } from "./combat-outcome-choices"
import { CombatStepCard } from "./combat-step-card"
import { CombatVariantInput } from "./combat-variant-input"

/** Strict: outcomes are read-only and steps show their time; free: outcomes are answered per step. */
export type CombatListMode =
	| { kind: "strict" }
	| {
			kind: "free"
			onChoiceChange: (
				id: number,
				outcome: string,
				happened: boolean | undefined,
			) => void
	  }

type CombatStepListProps = {
	items: readonly CombatListItem[]
	mode: CombatListMode
	/** The abilities as the form shows them, and the summoner slots, for the steps' names and icons. */
	spells: readonly Pick<ChampionSpell, "slot" | "name" | "icon">[]
	summoners: readonly (SummonerSpell | undefined)[]
	/** The marker just added, pointed out. */
	newMarkerId?: number
	onMove: (id: number, to: number) => void
	onRemove: (id: number) => void
	onRemoveMarker: (id: number) => void
	onWaitChange: (id: number, seconds: number) => void
	onVariantChange: (id: number, variant: string) => void
}

function stepIcon(
	action: CombatAction,
	{ spells, summoners }: Pick<CombatStepListProps, "spells" | "summoners">,
) {
	if (action.kind === "ability") {
		const spell = spells.find(({ slot }) => slot === action.slot)
		return spell && { src: spell.icon, name: spell.name }
	}
	if (action.kind === "summoner") {
		const spell = summoners[action.slot]
		return spell && { src: spell.icon, name: spell.name }
	}
	return undefined
}

/** A step's outcomes: read-only in strict mode, answered in free mode. */
function StepOutcomes({
	step,
	mode,
}: {
	step: CombatStepItem
	mode: CombatListMode
}) {
	if (step.refused) return null
	if (mode.kind === "strict")
		return <CombatOutcomeChips outcomes={step.outcomes} />
	return (
		<CombatOutcomeChoices
			outcomes={step.outcomes}
			note={step.attacksOnly}
			onAnswer={(id, answer) => {
				const outcome = step.outcomes.find((entry) => entry.id === id)
				if (outcome) {
					mode.onChoiceChange(step.id, id, outcomeChoice(outcome, answer))
				}
			}}
		/>
	)
}

/** A wait's length, in quarter seconds; an emptied field keeps the last length. */
function WaitLength({
	seconds,
	onChange,
}: {
	seconds: number
	onChange: (seconds: number) => void
}) {
	return (
		<div className="flex items-center gap-1.5 text-xs">
			<NumberField
				label="Wait in seconds"
				min={WAIT_SECONDS.min}
				max={WAIT_SECONDS.max}
				step={WAIT_SECONDS.step}
				value={seconds}
				onValueChange={(next) => {
					if (next !== null) onChange(next)
				}}
				className="[&_input]:w-12"
			/>
			<span aria-hidden className="text-subtle">
				s
			</span>
		</div>
	)
}

/**
 * The combo in order: action cards and situation marker lines, reordered by dragging or the arrow
 * keys, removed with ×.
 */
export function CombatStepList({
	items,
	mode,
	spells,
	summoners,
	newMarkerId,
	onMove,
	onRemove,
	onRemoveMarker,
	onWaitChange,
	onVariantChange,
}: CombatStepListProps) {
	const titleId = useId()
	const byId = new Map(items.map((item) => [item.id, item]))
	const names = {
		ability: (slot: string) =>
			spells.find((spell) => spell.slot === slot)?.name ?? slot,
		summoner: (slot: number) => summoners[slot]?.name ?? "Summoner spell",
	}
	const reorder = useStepReorder({
		ids: items.map(({ id }) => id),
		onMove,
		describeMove(id, to) {
			const item = byId.get(id)
			const label =
				item?.kind === "marker"
					? `Marker ${item.view.label}`
					: item
						? actionLabel(item.action, names)
						: "The step"
			return `${label} is now item ${to + 1} of ${items.length}`
		},
	})

	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-1.5">
			<h3 id={titleId} className="sr-only">
				Steps
			</h3>
			<ol ref={reorder.listRef} className="flex flex-col gap-1.5">
				{reorder.order.map((id) => {
					const item = byId.get(id)
					if (!item) return null
					const dragging = reorder.draggedId === id || undefined
					if (item.kind === "marker") {
						return (
							<CombatMarkerLine
								key={id}
								data-step-id={id}
								data-dragging={dragging}
								view={item.view}
								isNew={newMarkerId === id}
								handleProps={reorder.handleProps(id)}
								onRemove={() => onRemoveMarker(id)}
							/>
						)
					}
					const { action } = item
					return (
						<CombatStepCard
							key={id}
							data-step-id={id}
							data-dragging={dragging}
							number={item.number}
							label={actionLabel(action, names)}
							icon={
								<CombatActionIcon
									kind={action.kind}
									icon={stepIcon(action, { spells, summoners })}
								/>
							}
							time={mode.kind === "strict" ? item.time : undefined}
							refused={item.refused}
							view={item.view}
							handleProps={reorder.handleProps(id)}
							onRemove={() => onRemove(id)}
						>
							{action.kind === "wait" && (
								<WaitLength
									seconds={action.seconds}
									onChange={(seconds) => onWaitChange(id, seconds)}
								/>
							)}
							{action.kind === "ability" && (
								<CombatVariantInput
									variants={item.variants}
									value={action.variant}
									onValueChange={(variant) => onVariantChange(id, variant)}
								/>
							)}
							<StepOutcomes step={item} mode={mode} />
						</CombatStepCard>
					)
				})}
			</ol>
			<PoliteStatus message={reorder.announcement} />
		</section>
	)
}
