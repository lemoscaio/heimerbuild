import type { DamageType } from "@schemas/champion"
import type { CombatAction } from "@/lib/combat/combat"

const WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const TENTHS = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })
const SECONDS = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

/** "1,143" */
export function formatDamage(value: number): string {
	return WHOLE.format(value)
}

/** A resistance, to a tenth at most: "100", "56.4" */
export function formatResist(value: number): string {
	return TENTHS.format(value)
}

/** "0.87 s" */
export function formatSeconds(seconds: number): string {
	return `${SECONDS.format(seconds)} s`
}

/** "36%" */
export function formatShare(share: number): string {
	return `${WHOLE.format(share * 100)}%`
}

/** "62%" for a part that dealt damage; "<1%" when it rounds to nothing. */
export function formatPartPercent(percent: number): string {
	return percent ? `${percent}%` : "<1%"
}

export const DAMAGE_TYPE_NAMES = {
	physical: "physical",
	magic: "magic",
	true: "true",
} as const satisfies Record<DamageType, string>

/** An action's name in a step: "Attack", "Q", "Ignite", "Wait 1 s"; abilities and spells by the given names. */
export function actionLabel(
	action: CombatAction,
	names: {
		ability: (slot: string) => string
		summoner: (slot: number) => string
	},
): string {
	switch (action.kind) {
		case "attack":
			return "Attack"
		case "ability":
			return `${action.slot} · ${names.ability(action.slot)}`
		case "summoner":
			return names.summoner(action.slot)
		case "wait":
			return "Wait"
	}
}

/** "0.00–6.94 s" */
export function formatSecondsRange(from: number, to: number): string {
	return `${SECONDS.format(from)}–${formatSeconds(to)}`
}

type AreaResult = {
	/** A cast hitting again and again: the hits that landed, of its full duration's. */
	hits?: { count: number; of: number }
	ticks?: number
	/** What the hits are called ("spins"); "hits" by default. */
	hitsName?: string
}

/** What a time in an area deals, said beside it: "4 of 7 spins", "3 ticks"; nothing without either. */
export function formatAreaResult({
	hits,
	ticks,
	hitsName = "hits",
}: AreaResult): string | undefined {
	if (hits) return `${hits.count} of ${hits.of} ${hitsName}`
	if (ticks === undefined) return undefined
	return ticks === 1 ? "1 tick" : `${ticks} ticks`
}
