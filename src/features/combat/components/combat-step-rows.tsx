import { PoliteStatus } from "@/components/common/polite-status"
import { cn } from "@/lib/cn"
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
import { CombatProcRow } from "./combat-proc-row"
import { CombatStepGroupRow } from "./combat-step-group-row"
import {
	type CombatStepInputHandlers,
	CombatStepInputs,
} from "./combat-step-inputs"
import { type CombatListMode, CombatStepOutcomes } from "./combat-step-outcomes"
import { CombatStepRow, STEP_ROW_GRID } from "./combat-step-row"

type CombatStepRowsProps = {
	/** The entries as shown (`useCombatView`), the same as the Combo tab's cards. */
	items: readonly CombatShownItem[]
	/** The entries in the combo's order, which the moves follow. */
	list: readonly CombatListItem[]
	mode: CombatListMode
	sources: ActionSources
	/** The marker just added, pointed out. */
	newMarkerId?: number
	/** Moves the entries `ids` to position `to`. */
	onMove: (ids: readonly number[], to: number) => void
	onRemove: (id: number) => void
	/** Removes a whole group. */
	onRemoveAll: (ids: readonly number[]) => void
	onRemoveMarker: (id: number) => void
} & CombatStepInputHandlers &
	React.ComponentProps<"section">

/** The columns' names, over the rows; each row's cells say theirs to screen readers. */
function RowsHeader() {
	return (
		<div
			aria-hidden="true"
			className={cn(
				STEP_ROW_GRID,
				"border-line border-b px-4 py-2 text-[0.6875rem] text-subtle",
			)}
		>
			<span className="[grid-area:lands]">Lands</span>
			<span className="[grid-area:step]">Step</span>
			<span className="[grid-area:starts]">Starts</span>
			<span className="[grid-area:hits]">Hits and effects</span>
			<span className="text-right [grid-area:damage]">Damage</span>
			<span className="text-right [grid-area:dealt]">So far</span>
			<span className="[grid-area:health]">Target health</span>
		</div>
	)
}

type StepRowEntryProps = {
	step: CombatStepItem
	names: ActionNames
	moves: { up: MoveAction; down: MoveAction }
} & Pick<CombatStepRowsProps, "mode" | "sources" | "onRemove"> &
	CombatStepInputHandlers

/** A step's row with its own controls: its inputs and its outcomes. */
function StepRowEntry({
	step,
	names,
	moves,
	mode,
	sources,
	onRemove,
	...inputs
}: StepRowEntryProps) {
	const label = actionLabel(step.action, names)
	return (
		<CombatStepRow
			title={`${step.number}. ${label}`}
			icon={
				<CombatActionIcon
					kind={step.action.kind}
					icon={actionIcon(step.action, sources)}
				/>
			}
			row={step.row}
			view={step.view}
			refused={step.refused}
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

/** A proc's row: "from 1. Q · Disintegrate". */
function ProcRowEntry({
	item,
	names,
}: {
	item: CombatProcItem
	names: ActionNames
}) {
	return (
		<CombatProcRow
			proc={item.proc}
			timing={item.row}
			from={`${item.from.number}. ${actionLabel(item.from.action, names)}`}
		/>
	)
}

/**
 * The expanded combo's rows, the same entries as the Combo tab's cards (issue 405): steps, markers,
 * procs at their land time and groups of identical steps, in the order the page picked. Each
 * step, marker or group moves in the combo with its up and down buttons, and goes with ×.
 */
export function CombatStepRows({
	items,
	list,
	mode,
	sources,
	newMarkerId,
	onMove,
	onRemove,
	onRemoveAll,
	onRemoveMarker,
	onWaitChange,
	onVariantChange,
	onInAreaChange,
	className,
	...props
}: CombatStepRowsProps) {
	const names = actionNames(sources)
	const moves = useCombatMoves({ list, items, names, onMove })
	const expansion = useGroupExpansion()
	const stepProps = {
		names,
		mode,
		sources,
		onRemove,
		onWaitChange,
		onVariantChange,
		onInAreaChange,
	}
	const groupIds = (group: CombatGroupItem) => group.steps.map(({ id }) => id)

	return (
		<section
			aria-label="Steps"
			className={cn("flex flex-col", className)}
			{...props}
		>
			<RowsHeader />
			<ol className="flex flex-col">
				{items.map((item) => {
					if (item.kind === "proc") {
						return <ProcRowEntry key={item.key} item={item} names={names} />
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
								className="mx-4 my-1"
							/>
						)
					}
					if (item.kind === "step") {
						return (
							<StepRowEntry
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
						<CombatStepGroupRow
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
									<ProcRowEntry key={inner.key} item={inner} names={names} />
								) : (
									<StepRowEntry
										key={inner.id}
										step={inner}
										moves={moves.inGroup(item, inner.id)}
										{...stepProps}
									/>
								),
							)}
						</CombatStepGroupRow>
					)
				})}
			</ol>
			<PoliteStatus message={moves.announcement} />
		</section>
	)
}
