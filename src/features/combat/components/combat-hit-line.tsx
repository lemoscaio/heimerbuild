import type { HitView } from "../lib/combat-view"
import { CombatHitText } from "./combat-hit-text"

/** One line per source: "Harrier · 45 physical (raw 76)", "[icon] Wit's End (Fray) · 45 magic", or why it has no number. */
export function CombatHitLine({ hit }: { hit: HitView }) {
	return (
		<li>
			<CombatHitText hit={hit} />
		</li>
	)
}
