import { cva } from "class-variance-authority"
import { formatDamage, formatSeconds } from "../lib/combat-format"
import type { CombatTotals } from "../lib/combat-view"
import { CombatTotal } from "./combat-total"

/** Two lines always reserved, so the card keeps its height whether or not effects outlast the damage. */
const activeUntilLine = cva(
	"line-clamp-2 h-7 text-[0.6875rem] text-subtle tabular-nums leading-3.5",
	{
		variants: {
			shown: {
				true: "visible",
				false: "invisible",
			},
		},
	},
)

/** "effects active until 4.00 s" under the time, when an effect or mark outlasts the last damage. */
function ActiveUntil({
	totals,
}: {
	totals: Pick<CombatTotals, "duration" | "activeUntil">
}) {
	const shown = totals.activeUntil > totals.duration
	return (
		<p aria-hidden={!shown} className={activeUntilLine({ shown })}>
			{shown && `effects active until ${formatSeconds(totals.activeUntil)}`}
		</p>
	)
}

/** The combo's time (its last damage) and kill (its time and step) or the health left. */
export function CombatTiming({ totals }: { totals: CombatTotals }) {
	return (
		<>
			<CombatTotal term="Time" details={<ActiveUntil totals={totals} />}>
				{formatSeconds(totals.duration)}
			</CombatTotal>
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
