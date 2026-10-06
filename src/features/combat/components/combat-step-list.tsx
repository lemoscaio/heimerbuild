import type { ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { NumberField } from "@/components/ui/number-field"
import type { CombatAction } from "@/lib/combat/combat"
import { useStepReorder } from "../hooks/use-step-reorder"
import { actionLabel } from "../lib/combat-format"
import { WAIT_SECONDS } from "../lib/combat-sequence"
import type { StepView } from "../lib/combat-view"
import { CombatActionIcon } from "./combat-action-icon"
import { CombatStepCard } from "./combat-step-card"

export type CombatStepItem = {
	id: number
	action: CombatAction
	time?: number
	refused?: string
	view?: StepView
}

type CombatStepListProps = {
	steps: readonly CombatStepItem[]
	/** The abilities as the form shows them, and the summoner slots, for the steps' names and icons. */
	spells: readonly Pick<ChampionSpell, "slot" | "name" | "icon">[]
	summoners: readonly (SummonerSpell | undefined)[]
	onMove: (id: number, to: number) => void
	onRemove: (id: number) => void
	onWaitChange: (id: number, seconds: number) => void
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

/** The combo's steps in order, as cards: reordered by dragging or the arrow keys, removed with ×. */
export function CombatStepList({
	steps,
	spells,
	summoners,
	onMove,
	onRemove,
	onWaitChange,
}: CombatStepListProps) {
	const titleId = useId()
	const byId = new Map(steps.map((step) => [step.id, step]))
	const names = {
		ability: (slot: string) =>
			spells.find((spell) => spell.slot === slot)?.name ?? slot,
		summoner: (slot: number) => summoners[slot]?.name ?? "Summoner spell",
	}
	const reorder = useStepReorder({
		ids: steps.map(({ id }) => id),
		onMove,
		describeMove(id, to) {
			const step = byId.get(id)
			const label = step ? actionLabel(step.action, names) : "The step"
			return `${label} is now step ${to + 1} of ${steps.length}`
		},
	})
	// An emptied field keeps the last length.
	function changeWait(id: number, seconds: number | null) {
		if (seconds !== null) onWaitChange(id, seconds)
	}

	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-1.5">
			<h3 id={titleId} className="sr-only">
				Steps
			</h3>
			<ol ref={reorder.listRef} className="flex flex-col gap-1.5">
				{reorder.order.map((id, index) => {
					const step = byId.get(id)
					if (!step) return null
					const { action } = step
					return (
						<CombatStepCard
							key={id}
							data-step-id={id}
							data-dragging={reorder.draggedId === id || undefined}
							position={index + 1}
							label={actionLabel(action, names)}
							icon={
								<CombatActionIcon
									kind={action.kind}
									icon={stepIcon(action, { spells, summoners })}
								/>
							}
							time={step.time}
							refused={step.refused}
							view={step.view}
							handleProps={reorder.handleProps(id)}
							onRemove={() => onRemove(id)}
						>
							{action.kind === "wait" && (
								<div className="flex items-center gap-1.5 text-xs">
									<NumberField
										label="Wait in seconds"
										min={WAIT_SECONDS.min}
										max={WAIT_SECONDS.max}
										step={WAIT_SECONDS.step}
										value={action.seconds}
										onValueChange={(next) => changeWait(id, next)}
										className="[&_input]:w-12"
									/>
									<span aria-hidden className="text-subtle">
										s
									</span>
								</div>
							)}
						</CombatStepCard>
					)
				})}
			</ol>
			<PoliteStatus message={reorder.announcement} />
		</section>
	)
}
