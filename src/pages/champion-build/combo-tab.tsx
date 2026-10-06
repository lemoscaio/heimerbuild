import type { Champion } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { CircleAlert } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { CombatActionKeys } from "@/features/combat/components/combat-action-keys"
import { CombatNotes } from "@/features/combat/components/combat-notes"
import { CombatStepList } from "@/features/combat/components/combat-step-list"
import { CombatTotals } from "@/features/combat/components/combat-totals"
import { useCombatView } from "@/features/combat/hooks/use-combat-view"
import { TargetEditor } from "@/features/target/components/target-editor"
import type { BuildCombat } from "./hooks/use-build-combat"

type ComboTabProps = {
	combat: BuildCombat
	champion: Champion
	summoners: readonly (SummonerSpell | undefined)[]
}

/** The Combo tab: the action keys and the target, the totals, then one card per step (issue 265). */
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

	return (
		<section
			aria-labelledby={titleId}
			className="flex flex-col gap-4 text-white"
		>
			<div className="flex items-center justify-between gap-2">
				<h2 id={titleId} className="font-bold font-display text-base">
					Combo
				</h2>
				{!!combat.steps.length && (
					<Button variant="secondary" size="sm" onClick={combat.clear}>
						Clear
					</Button>
				)}
			</div>
			<div className="grid gap-4 md:grid-cols-[1fr_auto]">
				<div className="flex flex-col gap-1.5">
					<CombatActionKeys
						keys={combat.keys}
						onAdd={combat.add}
						disabled={combat.isFull}
					/>
					<p className="text-subtle text-xs">
						Pick an action to add it at the end. Drag a step's handle or use its
						arrow keys to reorder; × removes it.
					</p>
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
			{view.totals && <CombatTotals totals={view.totals} />}
			{combat.steps.length ? (
				<CombatStepList
					steps={view.steps}
					spells={combat.spells}
					summoners={summoners}
					onMove={combat.move}
					onRemove={combat.remove}
					onWaitChange={combat.setWait}
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
