import { formatSecondsSpan } from "../lib/combat-format"

/** When a step's hits land, bold: "0.27 s", a range for several moments, a dash for none. */
export function CombatLandTime({
	lands,
}: {
	lands?: { first: number; last: number }
}) {
	return (
		<span className="font-bold font-display text-sm tabular-nums">
			<span className="sr-only">Lands </span>
			{lands ? formatSecondsSpan(lands) : "–"}
		</span>
	)
}
