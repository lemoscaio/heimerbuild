import { GameIcon } from "@/components/common/game-icon"
import type { HitView } from "../lib/combat-view"
import { CombatHitDamage } from "./combat-hit-damage"

/**
 * One source's hits: "[icon] Wit's End (Fray) · 45 magic (raw 45)", "Harrier ×2 · 45 physical (raw
 * 76)", or why it has no number; an effect's with its icon.
 */
export function CombatHitText({ hit }: { hit: HitView }) {
	return (
		<>
			{!!hit.icon && (
				<GameIcon
					name={hit.name}
					src={hit.icon}
					className="mr-1 inline-flex size-3.5 rounded-xs align-[-0.2em]"
				/>
			)}
			<span className={"notModeled" in hit ? "text-warning" : undefined}>
				{hit.name}
				{"count" in hit && hit.count > 1 && ` ×${hit.count}`}
			</span>{" "}
			· <CombatHitDamage hit={hit} />
		</>
	)
}
