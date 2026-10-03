import type { EffectCondition } from "@/lib/effects/effect"
import type { ResolvedGrant } from "@/lib/effects/evaluate"
import { itemStatLines } from "@/lib/item-stats"
import type { Condition } from "./conditions"

const CONDITION_TEXT = {
	"not-damaged-recently": "Not hit by a champion or turret for 5 s",
} as const satisfies Record<EffectCondition, string>

function lasting(duration: number | undefined, when: string) {
	if (duration !== undefined) return `For ${duration} s ${when}`
	return `${when.charAt(0).toUpperCase()}${when.slice(1)}`
}

/** When the effect holds: "For 10 s after casting", "Not hit by a champion or turret for 5 s". */
export function conditionText({ effect, duration }: Condition): string {
	const { trigger } = effect.effect
	switch (trigger.kind) {
		case "always":
			return "Always"
		case "while":
			return CONDITION_TEXT[trigger.condition]
		case "after-use":
			return lasting(duration, "after casting")
		case "after-summoner":
			return lasting(
				duration,
				`after casting ${effect.spell?.name ?? "a summoner spell"}`,
			)
		case "on-hit":
			return lasting(duration, "on hit")
		case "after-ability":
			return lasting(duration, "after an ability")
	}
}

const PART_LABEL = { passive: "Passive", active: "Active" } as const

/** The row's label in its card: the part of the ability ("Passive", "Active"), when it has one. */
export function partLabel({ effect }: Condition): string | undefined {
	return effect.effect.part && PART_LABEL[effect.effect.part]
}

/** Why a row's switch is off limits: "Replaced by the active". */
export function stackedOutText({
	stackedOutBy,
}: Condition): string | undefined {
	if (!stackedOutBy) return undefined
	const winner = stackedOutBy.effect.part ?? stackedOutBy.name
	return `Replaced by the ${winner}`
}

/** What a grant gives, as shown: "+35.3% Move Speed", "269 shield", "192 heal". */
export function grantText(grant: ResolvedGrant): string {
	switch (grant.kind) {
		case "stat": {
			const [line] = itemStatLines({ [grant.stat]: grant.value })
			return line ? `${line.value} ${line.label}` : ""
		}
		case "shield":
		case "heal":
			return `${Math.round(grant.value)} ${grant.kind}`
	}
}
