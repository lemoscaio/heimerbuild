import type { SummonerSpell } from "@schemas/summoner-spell"
import {
	isSmiteUpgrade,
	SMITE_KEY,
	SMITE_UPGRADE_DETAILS,
	SMITE_UPGRADES,
	type SmiteUpgrade,
} from "@/lib/smite-upgrade"

/** The control's value for base Smite, which the link leaves out. */
export const BASE_SMITE = "base"

export type SmiteUpgradeOption = {
	value: SmiteUpgrade | typeof BASE_SMITE
	label: string
}

export const SMITE_UPGRADE_OPTIONS: readonly SmiteUpgradeOption[] = [
	{ value: BASE_SMITE, label: "Smite" },
	...SMITE_UPGRADES.map((upgrade) => ({
		value: upgrade,
		label: SMITE_UPGRADE_DETAILS[upgrade].short,
	})),
]

/** The upgrade a control value names; base Smite is none. */
export function smiteUpgradeOf(value: string | undefined) {
	return isSmiteUpgrade(value) ? value : undefined
}

function firstValue(spell: SummonerSpell, name: string) {
	return spell.values[name]?.[0]
}

/**
 * What the upgrade does to a champion, from the synced values: "Fed 15 treats: 40 true damage to a
 * champion, slowed 20% for 2 s". Base Smite says it can't.
 */
export function smiteUpgradeText(
	spell: SummonerSpell,
	upgrade: SmiteUpgrade | undefined,
) {
	if (!upgrade) return "Can't target champions until your jungle pet is fed."
	const damage = firstValue(spell, "firstpvpdamage")
	const slow = firstValue(spell, "smiteslowamount")
	const seconds = firstValue(spell, "smiteslowduration")
	const { treats } = SMITE_UPGRADE_DETAILS[upgrade]
	if (damage === undefined || slow === undefined || seconds === undefined)
		return `Fed ${treats} treats.`
	return `Fed ${treats} treats: ${damage} true damage to a champion, slowed ${Math.round(slow * 100)}% for ${seconds} s.`
}

/** The upgrade a slot's spell has, if any: only Smite upgrades. */
export function slotUpgrade(
	spell: Pick<SummonerSpell, "key"> | undefined,
	upgrade: SmiteUpgrade | undefined,
) {
	return spell?.key === SMITE_KEY && upgrade
		? SMITE_UPGRADE_DETAILS[upgrade]
		: undefined
}
