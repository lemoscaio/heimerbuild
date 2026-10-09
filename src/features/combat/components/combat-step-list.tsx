import type { ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import type {
	CombatGroupItem,
	CombatShownItem,
	CombatStepItem,
} from "../hooks/use-combat-view"
import { useGroupExpansion } from "../hooks/use-group-expansion"
import { useProcLayout } from "../hooks/use-proc-layout"
import { type MoveAction, useStepReorder } from "../hooks/use-step-reorder"
import {
	type ActionNames,
	actionIcon,
	actionNames,
} from "../lib/combat-action-names"
import { actionLabel } from "../lib/combat-format"
import { procsOutside } from "../lib/combat-procs-outside"
import { withoutProcs } from "../lib/combat-view"
import { CombatActionIcon } from "./combat-action-icon"
import { CombatAreaTimeInput } from "./combat-area-time-input"
import { CombatMarkerLine } from "./combat-marker-line"
import { CombatMoveButtons } from "./combat-move-buttons"
import { CombatProcCard } from "./combat-proc-card"
import { CombatStepCard } from "./combat-step-card"
import { CombatStepGroup } from "./combat-step-group"
import { type CombatListMode, CombatStepOutcomes } from "./combat-step-outcomes"
import { CombatVariantInput } from "./combat-variant-input"
import { CombatWaitLength } from "./combat-wait-length"

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
	/** An ability step's seconds in its area (issue 427). */
	onInAreaChange: (id: number, seconds: number) => void
}

type StepEntryProps = {
	step: CombatStepItem
	mode: CombatListMode
	names: ActionNames
	moves: { up: MoveAction; down: MoveAction }
	/** PROTOTYPE (PR 434): its procs listed among the steps instead of inside its card. */
	procsOutside: boolean
} & Pick<
	CombatStepListProps,
	| "spells"
	| "summoners"
	| "onRemove"
	| "onWaitChange"
	| "onVariantChange"
	| "onInAreaChange"
>

/** An action's card with its own controls: its wait's length, its input, its outcomes. */
function StepEntry({
	step,
	mode,
	names,
	moves,
	procsOutside: outside,
	spells,
	summoners,
	onRemove,
	onWaitChange,
	onVariantChange,
	onInAreaChange,
}: StepEntryProps) {
	const { id, action } = step
	const label = actionLabel(action, names)
	const view = outside && step.view ? withoutProcs(step.view) : step.view
	return (
		<CombatStepCard
			number={step.number}
			label={label}
			icon={
				<CombatActionIcon
					kind={action.kind}
					icon={actionIcon(action, { spells, summoners })}
				/>
			}
			time={step.time}
			refused={step.refused}
			view={view}
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
				<CombatWaitLength
					seconds={action.seconds}
					onChange={(seconds) => onWaitChange(id, seconds)}
				/>
			)}
			{action.kind === "ability" && (
				<CombatVariantInput
					variants={step.variants}
					label={step.variantsLabel}
					value={action.variant}
					onValueChange={(variant) => onVariantChange(id, variant)}
				/>
			)}
			{step.area && (
				<CombatAreaTimeInput
					area={step.area}
					onSecondsChange={(seconds) => onInAreaChange(id, seconds)}
				/>
			)}
			<CombatStepOutcomes step={step} mode={mode} />
		</CombatStepCard>
	)
}

/** PROTOTYPE (PR 434): where a step or group happens, which an outside proc landing later follows. */
function shownTime(item: CombatShownItem) {
	if (item.kind === "step") return item.time
	return item.kind === "group" ? item.view.time?.from : undefined
}

/** PROTOTYPE (PR 434): the procs a shown item lists among the steps; a group's show once it opens. */
function shownProcs(item: CombatShownItem) {
	return item.kind === "step" ? (item.view?.procs ?? []) : []
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
	onInAreaChange,
}: CombatStepListProps) {
	const titleId = useId()
	const names = actionNames({ spells, summoners })
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
	const outside = useProcLayout() === "outside"
	const shown = outside
		? procsOutside(items, { timeOf: shownTime, procsOf: shownProcs })
		: items.map((item) => ({ kind: "item" as const, item }))
	const fromLabel = (step: CombatStepItem) =>
		`${step.number}. ${actionLabel(step.action, names)}`
	const stepProps = {
		procsOutside: outside,
		mode,
		names,
		spells,
		summoners,
		onRemove,
		onWaitChange,
		onVariantChange,
		onInAreaChange,
	}

	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-1.5">
			<h3 id={titleId} className="sr-only">
				Steps
			</h3>
			<ol className="flex flex-col gap-1.5">
				{shown.map((entry) => {
					if (entry.kind === "proc") {
						const { proc, owner } = entry
						return (
							<CombatProcCard
								key={`proc-${owner.id}-${proc.effectId}@${proc.time}`}
								proc={proc}
								from={owner.kind === "step" ? fromLabel(owner) : ""}
							/>
						)
					}
					const { item } = entry
					const position = items.indexOf(item)
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
									icon={actionIcon(item.action, { spells, summoners })}
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
							{(outside
								? procsOutside(item.steps, {
										timeOf: ({ time }) => time,
										procsOf: ({ view }) => view?.procs ?? [],
									})
								: item.steps.map((step) => ({
										kind: "item" as const,
										item: step,
									}))
							).map((inner) =>
								inner.kind === "proc" ? (
									<CombatProcCard
										key={`proc-${inner.owner.id}-${inner.proc.effectId}@${inner.proc.time}`}
										proc={inner.proc}
										from={fromLabel(inner.owner)}
									/>
								) : (
									<StepEntry
										key={inner.item.id}
										step={inner.item}
										moves={reorder.moves(
											inside,
											item.steps.indexOf(inner.item),
										)}
										{...stepProps}
									/>
								),
							)}
						</CombatStepGroup>
					)
				})}
			</ol>
			<PoliteStatus message={reorder.announcement} />
		</section>
	)
}
