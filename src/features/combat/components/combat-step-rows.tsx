import { PoliteStatus } from "@/components/common/polite-status"
import { cn } from "@/lib/cn"
import type { CombatRowItem, CombatStepRowItem } from "../hooks/use-combat-rows"
import { type MoveAction, useStepReorder } from "../hooks/use-step-reorder"
import {
	type ActionNames,
	type ActionSources,
	actionIcon,
	actionNames,
} from "../lib/combat-action-names"
import { actionLabel } from "../lib/combat-format"
import { CombatActionIcon } from "./combat-action-icon"
import { CombatAreaTimeInput } from "./combat-area-time-input"
import { CombatMarkerLine } from "./combat-marker-line"
import { CombatMoveButtons } from "./combat-move-buttons"
import { CombatProcRow } from "./combat-proc-row"
import { type CombatListMode, CombatStepOutcomes } from "./combat-step-outcomes"
import { CombatStepRow, STEP_ROW_GRID } from "./combat-step-row"
import { CombatVariantInput } from "./combat-variant-input"
import { CombatWaitLength } from "./combat-wait-length"

type CombatStepRowsProps = {
	items: readonly CombatRowItem[]
	/** The entries' ids in the combo's order: the moves follow it, whatever the rows' order. */
	entryIds: readonly number[]
	mode: CombatListMode
	sources: ActionSources
	/** The marker just added, pointed out. */
	newMarkerId?: number
	/** Moves the entries `ids` to position `to`. */
	onMove: (ids: readonly number[], to: number) => void
	onRemove: (id: number) => void
	onRemoveMarker: (id: number) => void
	onWaitChange: (id: number, seconds: number) => void
	onVariantChange: (id: number, variant: string) => void
	/** An ability step's seconds in its area (issue 427). */
	onInAreaChange: (id: number, seconds: number) => void
} & React.ComponentProps<"section">

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
	step: CombatStepRowItem
	moves: { up: MoveAction; down: MoveAction }
	names: ActionNames
} & Pick<
	CombatStepRowsProps,
	| "mode"
	| "sources"
	| "onRemove"
	| "onWaitChange"
	| "onVariantChange"
	| "onInAreaChange"
>

/** A step's row with its own controls: its wait's length, its input, its outcomes. */
function StepRowEntry({
	step,
	moves,
	names,
	mode,
	sources,
	onRemove,
	onWaitChange,
	onVariantChange,
	onInAreaChange,
}: StepRowEntryProps) {
	const { id, action } = step
	const label = actionLabel(action, names)
	return (
		<CombatStepRow
			title={`${step.number}. ${label}`}
			icon={
				<CombatActionIcon
					kind={action.kind}
					icon={actionIcon(action, sources)}
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
			onRemove={() => onRemove(id)}
			inputs={
				<>
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
				</>
			}
			outcomes={<CombatStepOutcomes step={step} mode={mode} />}
		/>
	)
}

/** An entry's name in a move's announcement: "Marker Target marked by Harrier", "Attack". */
function entryLabel(item: CombatRowItem | undefined, names: ActionNames) {
	if (!item) return "The step"
	if (item.kind === "marker") return `Marker ${item.view.label}`
	if (item.kind === "proc") return item.proc.name
	return actionLabel(item.action, names)
}

/** What a screen reader hears after a move: the entry, and its new place in the combo. */
function moveDescriber(items: readonly CombatRowItem[], names: ActionNames) {
	return (ids: readonly number[], { at, of }: { at: number; of: number }) => {
		const item = items.find(
			(entry) => entry.kind !== "proc" && entry.id === ids[0],
		)
		return `${entryLabel(item, names)} is now item ${at + 1} of ${of}`
	}
}

/**
 * The expanded combo's rows, steps and markers, in the order the page picked. Each moves one
 * place in the combo with its up and down buttons, whatever the rows' order, and goes with ×.
 */
export function CombatStepRows({
	items,
	entryIds,
	mode,
	sources,
	newMarkerId,
	onMove,
	onRemove,
	onRemoveMarker,
	onWaitChange,
	onVariantChange,
	onInAreaChange,
	className,
	...props
}: CombatStepRowsProps) {
	const names = actionNames(sources)
	const blocks = entryIds.map((id) => [id])
	const reorder = useStepReorder({
		entryIds,
		onMove,
		describeMove: moveDescriber(items, names),
	})
	const stepProps = {
		mode,
		names,
		sources,
		onRemove,
		onWaitChange,
		onVariantChange,
		onInAreaChange,
	}

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
						return (
							<CombatProcRow
								key={item.key}
								proc={item.proc}
								timing={item.row}
								from={`${item.from.number}. ${actionLabel(item.from.action, names)}`}
							/>
						)
					}
					const position = entryIds.indexOf(item.id)
					const moves = reorder.moves(blocks, position)
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
								className="mx-4 my-1"
							/>
						)
					}
					return (
						<StepRowEntry
							key={item.id}
							step={item}
							moves={moves}
							{...stepProps}
						/>
					)
				})}
			</ol>
			<PoliteStatus message={reorder.announcement} />
		</section>
	)
}
