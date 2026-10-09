import type { Champion } from "@schemas/champion"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { ComboViewToggle } from "@/features/build-calculator/components/combo-view-toggle"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { CombatActionKeys } from "@/features/combat/components/combat-action-keys"
import { CombatFreeBanner } from "@/features/combat/components/combat-free-banner"
import { CombatFreeModeSwitch } from "@/features/combat/components/combat-free-mode-switch"
import { CombatNotes } from "@/features/combat/components/combat-notes"
import { CombatRowOrderSwitch } from "@/features/combat/components/combat-row-order-switch"
import { CombatRowsToolbar } from "@/features/combat/components/combat-rows-toolbar"
import { CombatSituationChips } from "@/features/combat/components/combat-situation-chips"
import type { CombatListMode } from "@/features/combat/components/combat-step-outcomes"
import { CombatStepRows } from "@/features/combat/components/combat-step-rows"
import { CombatTimeline } from "@/features/combat/components/combat-timeline"
import { CombatTiming } from "@/features/combat/components/combat-timing"
import { CombatTotals } from "@/features/combat/components/combat-totals"
import { CombatUncuratedNote } from "@/features/combat/components/combat-uncurated-note"
import { CombatUndoNotice } from "@/features/combat/components/combat-undo-notice"
import { CombatViewSwitch } from "@/features/combat/components/combat-view-switch"
import { useCombatRows } from "@/features/combat/hooks/use-combat-rows"
import { useCombatTimeline } from "@/features/combat/hooks/use-combat-timeline"
import { useCombatViewMode } from "@/features/combat/hooks/use-combat-view-mode"
import { useMarkerUndo } from "@/features/combat/hooks/use-marker-undo"
import { TargetEditor } from "@/features/target/components/target-editor"
import { ChampionBuildBar } from "./champion-build-bar"
import type { BuildPage } from "./hooks/use-build-page"

type ExpandedComboPageProps = {
	build: BuildPage
	champion: Champion
	copyLink: React.ReactNode
	/** Gets the focus back after the switch (`useComboToggleFocus`). */
	toggleRef: React.Ref<HTMLButtonElement>
}

type ComboParts = {
	build: BuildPage
	champion: Champion
	markers: ReturnType<typeof useMarkerUndo>
}

/** The side column: the controls, the action keys and situations, the target, the totals and the notes. */
function ComboControls({
	build,
	champion,
	markers,
	toggle,
	totals,
}: ComboParts & {
	toggle: React.ReactNode
	totals: React.ReactNode
}) {
	const titleId = useId()
	const { combat, target } = build.combat
	return (
		<section
			aria-labelledby={titleId}
			className="flex min-h-full flex-col gap-4 text-white"
		>
			<div className="flex items-center justify-between gap-2">
				<h2 id={titleId} className="font-bold font-display text-lg">
					Combo
				</h2>
				{toggle}
			</div>
			<div className="flex items-center justify-between gap-2">
				<CombatFreeModeSwitch
					checked={combat.free}
					onCheckedChange={combat.setFree}
					className="min-w-0 flex-1"
				/>
				{!!combat.entries.length && (
					<Button variant="secondary" size="sm" onClick={combat.clear}>
						Clear
					</Button>
				)}
			</div>
			<div className="flex flex-col gap-1.5">
				<span aria-hidden="true" className="text-subtle text-xs">
					Add a step
				</span>
				<CombatActionKeys
					keys={combat.keys}
					onAdd={combat.add}
					disabled={combat.isFull}
				/>
				<CombatSituationChips
					situations={combat.situations}
					onAdd={markers.add}
					disabled={combat.isFull}
					className="mt-2"
				/>
			</div>
			{markers.notice && (
				<CombatUndoNotice
					message={markers.notice.message}
					onUndo={markers.undo}
				/>
			)}
			{!combat.isCurated && (
				<CombatUncuratedNote championName={champion.name} />
			)}
			<TargetEditor target={target} className="border-line border-t pt-3" />
			{combat.free && (
				<CombatFreeBanner changes={combat.changes} onRestore={combat.restore} />
			)}
			<div className="flex flex-col gap-1.5 border-line border-t pt-3">
				{totals}
				{combat.free && (
					<p className="text-subtle text-xs">
						Free mode: times ignore cooldowns.
					</p>
				)}
			</div>
			<CombatNotes className="mt-auto" />
		</section>
	)
}

/**
 * From `lg` up, `view=combo`: the combo's controls, target and totals in a side column, its steps
 * as rows in a full-height column, the build bar below. Same combo as the Combo tab (issue 401).
 */
export function ExpandedComboPage({
	build,
	champion,
	copyLink,
	toggleRef,
}: ExpandedComboPageProps) {
	const { combat, target, effects } = build.combat
	const viewOptions = {
		combat,
		target: target.target,
		effects,
		passiveName: champion.abilities.passive.name,
	}
	const rows = useCombatRows(viewOptions)
	const timeline = useCombatTimeline(viewOptions)
	const [viewMode, setViewMode] = useCombatViewMode()
	const hasSteps = !!combat.entries.length
	const sources = { spells: combat.spells, summoners: build.summoners.slots }
	const markers = useMarkerUndo(combat)
	const mode: CombatListMode = combat.free
		? { kind: "free", onChoiceChange: combat.setChoice }
		: { kind: "strict" }
	const stepCount = rows.items.filter(({ kind }) => kind === "step").length

	return (
		<WorkbenchLayout
			view="combo"
			actions={copyLink}
			build={
				<ComboControls
					build={build}
					champion={champion}
					markers={markers}
					toggle={
						<ComboViewToggle
							ref={toggleRef}
							view={build.view}
							onViewChange={build.setView}
							size="sm"
						/>
					}
					totals={
						rows.totals && (
							<CombatTotals totals={rows.totals} layout="square">
								<CombatTiming totals={rows.totals} />
							</CombatTotals>
						)
					}
				/>
			}
			shop={
				<div className="@container flex min-h-0 flex-1 flex-col text-white">
					<CombatRowsToolbar count={stepCount}>
						<CombatViewSwitch value={viewMode} onValueChange={setViewMode} />
						{viewMode === "list" && (
							<CombatRowOrderSwitch
								value={rows.order}
								onValueChange={rows.setOrder}
							/>
						)}
					</CombatRowsToolbar>
					<div
						// biome-ignore lint/a11y/noNoninteractiveTabindex: a scroller needs a tab stop to scroll by keyboard
						tabIndex={0}
						className="scrollbar-purple scroll-fade-content min-h-0 flex-1 overflow-y-auto outline-none"
					>
						{hasSteps && viewMode === "list" && (
							<CombatStepRows
								items={rows.items}
								entryIds={rows.entryIds}
								mode={mode}
								sources={sources}
								newMarkerId={markers.notice?.markerId}
								onMove={combat.move}
								onRemove={combat.remove}
								onRemoveMarker={markers.remove}
								onWaitChange={combat.setWait}
								onVariantChange={combat.setVariant}
								onInAreaChange={combat.setInArea}
							/>
						)}
						{hasSteps && viewMode === "timeline" && timeline && (
							<CombatTimeline
								timeline={timeline}
								items={rows.list}
								sources={sources}
								className="px-3.5 pt-2"
							/>
						)}
						{!hasSteps && (
							<p className="m-4 rounded-lg border border-line border-dashed p-4 text-center text-subtle text-xs">
								No steps yet. Pick an attack, an ability or a summoner spell.
							</p>
						)}
					</div>
				</div>
			}
			bar={<ChampionBuildBar build={build} champion={champion} />}
		/>
	)
}
