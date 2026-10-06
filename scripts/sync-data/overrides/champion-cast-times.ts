import type { AbilitySlot, Champion } from "../schemas/champion"
import type { FieldOverride } from "./apply-overrides"

const WIKI = "https://wiki.leagueoflegends.com/en-us/Template:Data_"

/**
 * Sets the cast time of some of a champion's abilities (0 is none): an override like the others,
 * so it is logged, ranged by patch and reported once Riot's data agrees with it.
 */
export function defineCastTimes({
	championKey,
	castTimes,
	...override
}: Omit<FieldOverride<Champion, "abilities">, "target" | "field" | "apply"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	castTimes: Partial<Record<AbilitySlot, number>>
}): FieldOverride<Champion, "abilities"> {
	return {
		...override,
		target: championKey,
		field: "abilities",
		apply: (abilities) => ({
			...abilities,
			spells: abilities.spells.map((spell) => {
				const castTime = castTimes[spell.slot]
				return castTime === undefined ? spell : { ...spell, castTime }
			}) as Champion["abilities"]["spells"],
		}),
	}
}

/**
 * The combo's curated champions whose game files give a cast time the wiki doesn't: the files'
 * `spellCastTime` is the animation's, also set on abilities that cast instantly.
 */
export const CHAMPION_CAST_TIMES = [
	defineCastTimes({
		id: "quinn-cast-times",
		championKey: "Quinn",
		since: "16.19",
		reason:
			"Heightened Senses and Vault have no cast time; the game files give 0.25 s",
		source: `${WIKI}Quinn/Vault`,
		castTimes: { W: 0, E: 0 },
	}),
	defineCastTimes({
		id: "lissandra-cast-times",
		championKey: "Lissandra",
		since: "16.19",
		reason:
			"Ring of Frost has no cast time and Frozen Tomb on an enemy takes 0.375 s; the game files give 0.25 s for both",
		source: `${WIKI}Lissandra/Frozen_Tomb`,
		castTimes: { W: 0, R: 0.375 },
	}),
]
