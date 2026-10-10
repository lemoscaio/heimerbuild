import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { useCombatMoves } from "../hooks/use-combat-moves"
import type {
	CombatGroupItem,
	CombatListItem,
	CombatProcItem,
	CombatShownItem,
	CombatStepItem,
} from "../hooks/use-combat-view"
import { useGroupExpansion } from "../hooks/use-group-expansion"
import type { MoveAction } from "../hooks/use-step-reorder"
import {
	type ActionNames,
	type ActionSources,
	actionIcon,
	actionNames,
} from "../lib/combat-action-names"
import { actionLabel, groupTitle } from "../lib/combat-format"
import { CombatActionIcon } from "./combat-action-icon"
import { CombatMarkerLine } from "./combat-marker-line"
import { CombatMoveButtons } from "./combat-move-buttons"
import { CombatProcCard } from "./combat-proc-card"
import { CombatStepCard } from "./combat-step-card"
import { CombatStepGroup } from "./combat-step-group"
import {
	type CombatStepInputHandlers,
	CombatStepInputs,
} from "./combat-step-inputs"
import { type CombatListMode, CombatStepOutcomes } from "./combat-step-outcomes"

type CombatStepListProps = {
	/** The entries as shown (`useCombatView`). */
	items: readonly CombatShownItem[]
	/** The entries in the combo's order, which the moves follow. */
	list: readonly CombatListItem[]
	mode: CombatListMode
	sources: ActionSources
	/** The marker just added, pointed out. */
	newMarkerId?: number
	/** Moves the entries `ids`, kept together, to position `to`. */
	onMove: (ids: readonly number[], to: number) => void
	onRemove: (id: number) => void
	/** Removes a whole group. */
	onRemoveAll: (ids: readonly number[]) => void
	onRemoveMarker: (id: number) => void
} & CombatStepInputHandlers

type StepEntryProps = {
	step: CombatStepItem
	names: ActionNames
	moves: { up: MoveAction; down: MoveAction }
} & Pick<CombatStepListProps, "mode" | "sources" | "onRemove"> &
	CombatStepInputHandlers

/** An action's card with its own controls: its inputs and its outcomes. */
function StepEntry({
	step,
	names,
	moves,
	mode,
	sources,
	onRemove,
	...inputs
}: StepEntryProps) {
	const label = actionLabel(step.action, names)
	return (
		<CombatStepCard
			title={`${step.number}. ${label}`}
			icon={
				<CombatActionIcon
					kind={step.action.kind}
					icon={actionIcon(step.action, sources)}
				/>
			}
			row={step.row}
			refused={step.refused}
			view={step.view}
			moves={
				<CombatMoveButtons
					label={`step ${step.number}, ${label}`}
					className="flex-col"
					{...moves}
				/>
			}
			onRemove={() => onRemove(step.id)}
			inputs={<CombatStepInputs step={step} {...inputs} />}
			outcomes={<CombatStepOutcomes step={step} mode={mode} />}
		/>
	)
}

/** A proc's card: "from 1. Q · Disintegrate". */
function ProcEntry({
	item,
	names,
}: {
	item: CombatProcItem
	names: ActionNames
}) {
	return (
		<CombatProcCard
			proc={item.proc}
			row={item.row}
			from={`${item.from.number}. ${actionLabel(item.from.action, names)}`}
		/>
	)
}

/**
 * The combo as cards in the Combo tab, the same entries as the expanded rows (issue 405): action
 * cards, situation marker lines, procs at their land time (issue 429) and groups of identical steps
 * (issue 331). Each step, marker or group moves in the combo with its up and down buttons, whatever
 * the order shown, and goes with ×.
 */
export function CombatStepList({
	items,
	list,
	mode,
	sources,
	newMarkerId,
	onMove,
	onRemove,
	onRemoveAll,
	onRemoveMarker,
	...inputs
}: CombatStepListProps) {
	const titleId = useId()
	const names = actionNames(sources)
	const moves = useCombatMoves({ list, items, names, onMove })
	const expansion = useGroupExpansion()
	const stepProps = { names, mode, sources, onRemove, ...inputs }
	const groupIds = (group: CombatGroupItem) => group.steps.map(({ id }) => id)

	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-1.5">
			<h3 id={titleId} className="sr-only">
				Steps
			</h3>
			<ol className="flex flex-col gap-1.5">
				{items.map((item) => {
					if (item.kind === "proc") {
						return <ProcEntry key={item.key} item={item} names={names} />
					}
					if (item.kind === "marker") {
						return (
							<CombatMarkerLine
								key={item.id}
								view={item.view}
								isNew={newMarkerId === item.id}
								moves={
									<CombatMoveButtons
										label={`marker ${item.view.label}`}
										start={moves.toStart(item.id)}
										{...moves.entry(item.id)}
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
								moves={moves.entry(item.id)}
								{...stepProps}
							/>
						)
					}
					const ids = groupIds(item)
					const title = groupTitle(item.numbers, {
						label: actionLabel(item.action, names),
						size: item.steps.length,
					})
					return (
						<CombatStepGroup
							key={`group-${item.id}`}
							title={title}
							icon={
								<CombatActionIcon
									kind={item.action.kind}
									icon={actionIcon(item.action, sources)}
								/>
							}
							view={item.view}
							timing={item.timing}
							{...(mode.kind === "free" && { changes: item.view.changes })}
							moves={
								<CombatMoveButtons
									label={`group ${title}`}
									className="flex-col"
									{...moves.group(item)}
								/>
							}
							open={expansion.isOpen(ids)}
							onOpenChange={(open) => expansion.setOpen(ids, open)}
							onRemove={() => onRemoveAll(ids)}
						>
							{item.entries.map((inner) =>
								inner.kind === "proc" ? (
									<ProcEntry key={inner.key} item={inner} names={names} />
								) : (
									<StepEntry
										key={inner.id}
										step={inner}
										moves={moves.inGroup(item, inner.id)}
										{...stepProps}
									/>
								),
							)}
						</CombatStepGroup>
					)
				})}
			</ol>
			<PoliteStatus message={moves.announcement} />
		</section>
	)
}
