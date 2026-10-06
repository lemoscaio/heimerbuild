import type { Champion } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { CircleAlert } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { CombatActionKeys } from "@/features/combat/components/combat-action-keys"
import { CombatFreeBanner } from "@/features/combat/components/combat-free-banner"
import { CombatFreeModeSwitch } from "@/features/combat/components/combat-free-mode-switch"
import { CombatNotes } from "@/features/combat/components/combat-notes"
import { CombatSituationChips } from "@/features/combat/components/combat-situation-chips"
import {
	type CombatListMode,
	CombatStepList,
} from "@/features/combat/components/combat-step-list"
import { CombatTiming } from "@/features/combat/components/combat-timing"
import { CombatTotal } from "@/features/combat/components/combat-total"
import { CombatTotals } from "@/features/combat/components/combat-totals"
import { CombatUndoNotice } from "@/features/combat/components/combat-undo-notice"
import { useCombatView } from "@/features/combat/hooks/use-combat-view"
import { useMarkerUndo } from "@/features/combat/hooks/use-marker-undo"
import { TargetEditor } from "@/features/target/components/target-editor"
import type { BuildCombat } from "./hooks/use-build-combat"

type ComboTabProps = {
	combat: BuildCombat
	champion: Champion
	summoners: readonly (SummonerSpell | undefined)[]
}

/**
 * The Combo tab (issue 265, option A; markers and free mode, issue 338 option A2): the action keys,
 * the situation chips and the target, free mode, the totals, then the steps and markers.
 */
export function ComboTab({
	combat: buildCombat,
	champion,
	summoners,
}: ComboTabProps) {
	const titleId = useId()
	const { combat, target, effects } = buildCombat
	const view = useCombatView({
		combat,
		target: target.target,
		effects,
		passiveName: champion.abilities.passive.name,
	})
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
				<p className="flex items-start gap-2 rounded-lg border border-line-strong p-3 text-prose text-xs leading-snug">
					<CircleAlert
						aria-hidden="true"
						className="mt-0.5 size-3.5 shrink-0 text-warning"
					/>
					{champion.name}'s damage isn't checked against the wiki yet: abilities
					the combo can't count are marked "Not modeled", and their hits show
					why.
				</p>
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
					{combat.free ? (
						<CombatTotal term="Time">
							<span className="font-normal font-sans text-subtle text-xs">
								Hidden in free mode
							</span>
						</CombatTotal>
					) : (
						<CombatTiming totals={view.totals} />
					)}
				</CombatTotals>
			)}
			{combat.entries.length ? (
				<CombatStepList
					items={view.items}
					mode={mode}
					spells={combat.spells}
					summoners={summoners}
					newMarkerId={markers.notice?.markerId}
					onMove={combat.move}
					onRemove={combat.remove}
					onRemoveMarker={markers.remove}
					onWaitChange={combat.setWait}
					onVariantChange={combat.setVariant}
				/>
			) : (
				<p className="rounded-lg border border-line border-dashed p-4 text-center text-subtle text-xs">
					No steps yet. Pick an attack, an ability or a summoner spell above.
				</p>
			)}
			<CombatNotes />
		</section>
	)
}
