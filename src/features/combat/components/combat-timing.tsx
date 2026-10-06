import { formatDamage, formatSeconds } from "../lib/combat-format"
import type { CombatTotals } from "../lib/combat-view"
import { CombatTotal } from "./combat-total"

/** The combo's time and kill (its time and step) or the health left; strict mode only. */
export function CombatTiming({ totals }: { totals: CombatTotals }) {
	return (
		<>
			<CombatTotal term="Time">{formatSeconds(totals.duration)}</CombatTotal>
			<CombatTotal term="Kill">
				{totals.kill ? (
					<span className="text-health text-sm">
						At {formatSeconds(totals.kill.time)} (step {totals.kill.step})
					</span>
				) : (
					<span className="text-sm">
						No · {formatDamage(totals.healthLeft)} health left
					</span>
				)}
			</CombatTotal>
		</>
	)
}
