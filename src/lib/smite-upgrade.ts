import type { SummonerSpell } from "@schemas/summoner-spell"

/** Smite's key in the synced spells. */
export const SMITE_KEY = "SummonerSmite"

/**
 * Smite once its jungle pet is fed: Unleashed at 15 treats, Primal at 35 (wiki Smite). Base Smite,
 * which can't target champions, is no upgrade (`undefined`), the link's default.
 */
export type SmiteUpgrade = "unleashed" | "primal"

export const SMITE_UPGRADES = [
	"unleashed",
	"primal",
] as const satisfies readonly SmiteUpgrade[]

export const SMITE_UPGRADE_DETAILS = {
	unleashed: { name: "Unleashed Smite", short: "Unleashed", treats: 15 },
	primal: { name: "Primal Smite", short: "Primal", treats: 35 },
} as const satisfies Record<
	SmiteUpgrade,
	{ name: string; short: string; treats: number }
>

export function isSmiteUpgrade(value: unknown): value is SmiteUpgrade {
	return SMITE_UPGRADES.some((upgrade) => upgrade === value)
}

/** The spell keys the build has upgraded, which upgraded-only effects need (`source.upgraded`). */
export function upgradedSpellKeys(
	upgrade: SmiteUpgrade | undefined,
): readonly string[] {
	return upgrade ? [SMITE_KEY] : []
}

/** Why the spell can't be cast on a champion target, if it can't: base Smite (wiki Smite). */
export function championTargetBlock(
	spell: Pick<SummonerSpell, "key" | "name">,
	upgraded: readonly string[],
): string | undefined {
	if (spell.key !== SMITE_KEY || upgraded.includes(spell.key)) return undefined
	return `${spell.name} hits champions only once upgraded (Unleashed or Primal)`
}
