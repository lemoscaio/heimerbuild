import { DAMAGE_TYPE_NAMES, formatDamage } from "../lib/combat-format"
import type { HitView } from "../lib/combat-view"
import { damageTypeText } from "./damage-type-styles"

/** A hit's damage: "45 magic (raw 45)", or why it has no number. */
export function CombatHitDamage({ hit }: { hit: HitView }) {
	if ("notModeled" in hit) {
		return (
			<span className="text-warning">
				not modeled: {hit.notModeled.join("; ")}
			</span>
		)
	}
	return (
		<>
			<span className={damageTypeText(hit.type)}>
				{formatDamage(hit.final)} {DAMAGE_TYPE_NAMES[hit.type]}
			</span>{" "}
			<span className="text-subtle">(raw {formatDamage(hit.raw)})</span>
		</>
	)
}
