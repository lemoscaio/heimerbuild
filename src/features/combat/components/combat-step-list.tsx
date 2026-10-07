import type { ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { NumberField } from "@/components/ui/number-field"
import type { CombatAction } from "@/lib/combat/combat"
import type {
	CombatGroupItem,
	CombatShownItem,
	CombatStepItem,
} from "../hooks/use-combat-view"
import { useGroupExpansion } from "../hooks/use-group-expansion"
import { type MoveAction, useStepReorder } from "../hooks/use-step-reorder"
import { actionLabel } from "../lib/combat-format"
import { WAIT_SECONDS } from "../lib/combat-sequence"
import { outcomeChoice, strictOutcomeViews } from "../lib/combat-view"
import { CombatActionIcon } from "./combat-action-icon"
import { CombatMarkerLine } from "./combat-marker-line"
import { CombatMoveButtons } from "./combat-move-buttons"
import { CombatOutcomeChips } from "./combat-outcome-chips"
import { CombatOutcomeChoices } from "./combat-outcome-choices"
import { CombatStepCard } from "./combat-step-card"
import { CombatStepGroup } from "./combat-step-group"
import { CombatVariantInput } from "./combat-variant-input"

/** Strict: outcomes are read-only; free: outcomes are answered per step. */
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
	items: readonly CombatShownItem[]
	mode: CombatListMode
	/** The abilities as the form shows them, and the summoner slots, for the steps' names and icons. */
	spells: readonly Pick<ChampionSpell, "slot" | "name" | "icon">[]
	summoners: readonly (SummonerSpell | undefined)[]
	/** The marker just added, pointed out. */
	newMarkerId?: number
	/** Moves the entries `ids`, kept together, to position `to`. */
	onMove: (ids: readonly number[], to: number) => void
	onRemove: (id: number) => void
	/** Removes a whole group. */
	onRemoveAll: (ids: readonly number[]) => void
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
		return <CombatOutcomeChips outcomes={strictOutcomeViews(step.outcomes)} />
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

type ActionNames = Parameters<typeof actionLabel>[1]

type StepEntryProps = {
	step: CombatStepItem
	mode: CombatListMode
	names: ActionNames
	moves: { up: MoveAction; down: MoveAction }
} & Pick<
	CombatStepListProps,
	"spells" | "summoners" | "onRemove" | "onWaitChange" | "onVariantChange"
>

/** An action's card with its own controls: its wait's length, its input, its outcomes. */
function StepEntry({
	step,
	mode,
	names,
	moves,
	spells,
	summoners,
	onRemove,
	onWaitChange,
	onVariantChange,
}: StepEntryProps) {
	const { id, action } = step
	const label = actionLabel(action, names)
	return (
		<CombatStepCard
			number={step.number}
			label={label}
			icon={
				<CombatActionIcon
					kind={action.kind}
					icon={stepIcon(action, { spells, summoners })}
				/>
			}
			time={step.time}
			refused={step.refused}
			view={step.view}
			moves={
				<CombatMoveButtons
					label={`step ${step.number}, ${label}`}
					className="flex-col"
					{...moves}
				/>
			}
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
					variants={step.variants}
					value={action.variant}
					onValueChange={(variant) => onVariantChange(id, variant)}
				/>
			)}
			<StepOutcomes step={step} mode={mode} />
		</CombatStepCard>
	)
}

/** "1–8. Attack ×8" */
function groupTitle(group: CombatGroupItem, names: ActionNames) {
	const { first, last } = group.numbers
	return `${first}–${last}. ${actionLabel(group.action, names)} ×${group.steps.length}`
}

/** Each shown item's entry ids: a group's all of its steps'. */
function itemBlocks(items: readonly CombatShownItem[]) {
	return items.map((item) =>
		item.kind === "group" ? item.steps.map(({ id }) => id) : [item.id],
	)
}

/** What a screen reader hears after a move: the item, and its new place in the list or in its group. */
function moveDescriber(items: readonly CombatShownItem[], names: ActionNames) {
	const groups = items.filter(
		(item): item is CombatGroupItem => item.kind === "group",
	)
	return (ids: readonly number[], { at, of }: { at: number; of: number }) => {
		const [id] = ids
		const group = groups.find(({ steps }) => steps[0]?.id === id)
		if (group && ids.length > 1) {
			// Its step numbers change with the move: name it by its action.
			return `Group ${actionLabel(group.action, names)} ×${group.steps.length} is now item ${at + 1} of ${of}`
		}
		const item = items.find((entry) => entry.id === id)
		if (item?.kind === "marker") {
			return `Marker ${item.view.label} is now item ${at + 1} of ${of}`
		}
		const inGroup = groups.find(({ steps }) =>
			steps.some((step) => step.id === id),
		)
		const step =
			inGroup?.steps.find((entry) => entry.id === id) ??
			(item?.kind === "step" ? item : undefined)
		const label = step ? actionLabel(step.action, names) : "The step"
		return inGroup
			? `${label} is now step ${at + 1} of ${of} in its group`
			: `${label} is now item ${at + 1} of ${of}`
	}
}

/**
 * The combo in order: action cards, situation marker lines and groups of identical steps (issue
 * 331), each moved with its up and down buttons and removed with ×. A step or a marker moves one
 * entry; a group moves past its whole neighbour and goes as a whole; open, its steps move among themselves.
 */
export function CombatStepList({
	items,
	mode,
	spells,
	summoners,
	newMarkerId,
	onMove,
	onRemove,
	onRemoveAll,
	onRemoveMarker,
	onWaitChange,
	onVariantChange,
}: CombatStepListProps) {
	const titleId = useId()
	const names: ActionNames = {
		ability: (slot: string) =>
			spells.find((spell) => spell.slot === slot)?.name ?? slot,
		summoner: (slot: number) => summoners[slot]?.name ?? "Summoner spell",
	}
	const blocks = itemBlocks(items)
	const entryIds = blocks.flat()
	// A step or a marker moves one entry at a time, so it can go inside a run (and split it).
	const entries = entryIds.map((id) => [id])
	const reorder = useStepReorder({
		entryIds,
		onMove,
		describeMove: moveDescriber(items, names),
	})
	const expansion = useGroupExpansion()
	const stepProps = {
		mode,
		names,
		spells,
		summoners,
		onRemove,
		onWaitChange,
		onVariantChange,
	}

	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-1.5">
			<h3 id={titleId} className="sr-only">
				Steps
			</h3>
			<ol className="flex flex-col gap-1.5">
				{items.map((item, position) => {
					const moves =
						item.kind === "group"
							? reorder.moves(blocks, position)
							: reorder.moves(entries, entryIds.indexOf(item.id))
					if (item.kind === "marker") {
						return (
							<CombatMarkerLine
								key={item.id}
								view={item.view}
								isNew={newMarkerId === item.id}
								moves={
									<CombatMoveButtons
										label={`marker ${item.view.label}`}
										start={reorder.toStart(blocks, position)}
										{...moves}
									/>
								}
								onRemove={() => onRemoveMarker(item.id)}
							/>
						)
					}
					if (item.kind === "step") {
						return (
							<StepEntry
								key={item.id}
								step={item}
								moves={moves}
								{...stepProps}
							/>
						)
					}
					const ids = blocks[position] ?? []
					const title = groupTitle(item, names)
					const inside = item.steps.map(({ id }) => [id])
					return (
						<CombatStepGroup
							key={`group-${item.id}`}
							title={title}
							icon={
								<CombatActionIcon
									kind={item.action.kind}
									icon={stepIcon(item.action, { spells, summoners })}
								/>
							}
							view={item.view}
							{...(mode.kind === "free" && { changes: item.view.changes })}
							moves={
								<CombatMoveButtons
									label={`group ${title}`}
									className="flex-col"
									{...moves}
								/>
							}
							open={expansion.isOpen(ids)}
							onOpenChange={(open) => expansion.setOpen(ids, open)}
							onRemove={() => onRemoveAll(ids)}
						>
							{item.steps.map((step, index) => (
								<StepEntry
									key={step.id}
									step={step}
									moves={reorder.moves(inside, index)}
									{...stepProps}
								/>
							))}
						</CombatStepGroup>
					)
				})}
			</ol>
			<PoliteStatus message={reorder.announcement} />
		</section>
	)
}
