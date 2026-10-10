import type { Champion } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { CombatActionKeys } from "@/features/combat/components/combat-action-keys"
import { CombatFreeBanner } from "@/features/combat/components/combat-free-banner"
import { CombatFreeModeSwitch } from "@/features/combat/components/combat-free-mode-switch"
import { CombatNotes } from "@/features/combat/components/combat-notes"
import { CombatRowOrderSwitch } from "@/features/combat/components/combat-row-order-switch"
import { CombatRowsToolbar } from "@/features/combat/components/combat-rows-toolbar"
import { CombatSituationChips } from "@/features/combat/components/combat-situation-chips"
import { CombatStartStrip } from "@/features/combat/components/combat-start-strip"
import { CombatStepList } from "@/features/combat/components/combat-step-list"
import type { CombatListMode } from "@/features/combat/components/combat-step-outcomes"
import { CombatTimeline } from "@/features/combat/components/combat-timeline"
import { CombatTiming } from "@/features/combat/components/combat-timing"
import { CombatTotals } from "@/features/combat/components/combat-totals"
import { CombatUncuratedNote } from "@/features/combat/components/combat-uncurated-note"
import { CombatUndoNotice } from "@/features/combat/components/combat-undo-notice"
import { CombatViewSwitch } from "@/features/combat/components/combat-view-switch"
import { useCombatRowOrder } from "@/features/combat/hooks/use-combat-row-order"
import { useCombatTimeline } from "@/features/combat/hooks/use-combat-timeline"
import { useCombatView } from "@/features/combat/hooks/use-combat-view"
import { useCombatViewMode } from "@/features/combat/hooks/use-combat-view-mode"
import { useMarkerUndo } from "@/features/combat/hooks/use-marker-undo"
import { TargetEditor } from "@/features/target/components/target-editor"
import type { BuildCombat } from "./hooks/use-build-combat"

type ComboTabProps = {
	combat: BuildCombat
	champion: Champion
	summoners: readonly (SummonerSpell | undefined)[]
	/** At the end of the header: the switch to the expanded combo, on desktop. */
	actions?: React.ReactNode
}

/**
 * The Combo tab (issue 265, option A; markers and free mode, issue 338 option A2): the action keys,
 * the situation chips and the target, free mode, the totals, the combo's start (issue 317), then
 * the steps and markers.
 */
export function ComboTab({
	combat: buildCombat,
	champion,
	summoners,
	actions,
}: ComboTabProps) {
	const titleId = useId()
	const { combat, target, effects } = buildCombat
	const viewOptions = {
		combat,
		target: target.target,
		effects,
		passiveName: champion.abilities.passive.name,
	}
	const [order, setOrder] = useCombatRowOrder()
	const view = useCombatView({ ...viewOptions, order })
	const timeline = useCombatTimeline(viewOptions)
	const [viewMode, setViewMode] = useCombatViewMode()
	const hasSteps = !!combat.entries.length
	const markers = useMarkerUndo(combat)
	const mode: CombatListMode = combat.free
		? { kind: "free", onChoiceChange: combat.setChoice }
		: { kind: "strict" }

	return (
		<section
			aria-labelledby={titleId}
			className="flex flex-col gap-4 text-white"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 id={titleId} className="font-bold font-display text-base">
					Combo
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					<CombatFreeModeSwitch
						checked={combat.free}
						onCheckedChange={combat.setFree}
					/>
					{!!combat.entries.length && (
						<Button variant="secondary" size="sm" onClick={combat.clear}>
							Clear
						</Button>
					)}
					{actions}
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-[1fr_auto]">
				<div className="flex flex-col gap-1.5">
					<CombatActionKeys
						keys={combat.keys}
						onAdd={combat.add}
						disabled={combat.isFull}
					/>
					<p className="text-subtle text-xs">
						Pick an action to add it at the end. Move a step with its up and
						down arrows; × removes it.
					</p>
					<CombatSituationChips
						situations={combat.situations}
						onAdd={markers.add}
						disabled={combat.isFull}
						className="mt-2"
					/>
				</div>
				<TargetEditor target={target} />
			</div>
			{!combat.isCurated && (
				<CombatUncuratedNote championName={champion.name} />
			)}
			{markers.notice && (
				<CombatUndoNotice
					message={markers.notice.message}
					onUndo={markers.undo}
				/>
			)}
			{combat.free && (
				<CombatFreeBanner changes={combat.changes} onRestore={combat.restore} />
			)}
			{view.totals && (
				<CombatTotals totals={view.totals}>
					<CombatTiming totals={view.totals} />
				</CombatTotals>
			)}
			{combat.free && (
				<p className="-mt-2 text-subtle text-xs">
					Free mode: times ignore cooldowns.
				</p>
			)}
			<CombatStartStrip
				view={combat.start}
				onReadyChange={combat.setStartReady}
				onStacksChange={combat.setStartStacks}
				onRunningChange={combat.setStartRunning}
			/>
			<CombatRowsToolbar
				count={view.list.filter(({ kind }) => kind === "step").length}
				className="border-0 p-0"
			>
				<CombatViewSwitch value={viewMode} onValueChange={setViewMode} />
				{viewMode === "list" && (
					<CombatRowOrderSwitch value={order} onValueChange={setOrder} />
				)}
			</CombatRowsToolbar>
			{hasSteps && viewMode === "list" && (
				<CombatStepList
					items={view.items}
					list={view.list}
					mode={mode}
					sources={{ spells: combat.spells, summoners }}
					newMarkerId={markers.notice?.markerId}
					onMove={combat.move}
					onRemove={combat.remove}
					onRemoveAll={combat.removeAll}
					onRemoveMarker={markers.remove}
					onWaitChange={combat.setWait}
					onVariantChange={combat.setVariant}
					onInAreaChange={combat.setInArea}
				/>
			)}
			{hasSteps && viewMode === "timeline" && timeline && (
				<CombatTimeline
					timeline={timeline}
					items={view.list}
					sources={{ spells: combat.spells, summoners }}
					className="rounded-xl border border-line bg-surface-sunken/50 px-2 pt-1"
				/>
			)}
			{!hasSteps && (
				<p className="rounded-lg border border-line border-dashed p-4 text-center text-subtle text-xs">
					No steps yet. Pick an attack, an ability or a summoner spell above.
				</p>
			)}
			<CombatNotes />
		</section>
	)
}
