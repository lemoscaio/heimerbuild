import { DAMAGE_TYPE_NAMES, formatDamage } from "../lib/combat-format"
import type { HitView } from "../lib/combat-view"
import { damageTypeText } from "./damage-type-styles"

/** One line per source: "Harrier · 45 physical (raw 76)", "Toxic Shot · 30 magic", or why it has no number. */
export function CombatHitLine({ hit }: { hit: HitView }) {
	if ("notModeled" in hit) {
		return (
			<li className="text-warning">
				{hit.name} · not modeled: {hit.notModeled.join("; ")}
			</li>
		)
	}
	return (
		<li>
			{hit.name}
			{hit.count > 1 && ` ×${hit.count}`} ·{" "}
			<span className={damageTypeText(hit.type)}>
				{formatDamage(hit.final)} {DAMAGE_TYPE_NAMES[hit.type]}
			</span>{" "}
			<span className="text-subtle">(raw {formatDamage(hit.raw)})</span>
		</li>
	)
}
