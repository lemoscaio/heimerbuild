import type {
	AbilitySlot,
	Champion,
	ChampionForm,
	ChampionSummary,
	LevelState,
	SkillRules,
} from "../schemas/champion"
import type { DataOverride, FieldOverride } from "./apply-overrides"

/** Summary fields are left out so `champions.json` never disagrees with `champions/<key>.json`. */
export type ChampionOverrideField = Exclude<
	keyof Champion,
	keyof ChampionSummary
>

export type ChampionOverride = DataOverride<Champion, ChampionOverrideField>

export function defineChampionOverride<Field extends ChampionOverrideField>({
	championKey,
	...override
}: Omit<FieldOverride<Champion, Field>, "target"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
}): FieldOverride<Champion, Field> {
	return { ...override, target: championKey }
}

/** Sets a champion's `levelStates`: an override like the others, so it is logged, ranged by patch and validated. */
export function defineLevelStates({
	championKey,
	levelStates,
	...override
}: Omit<
	FieldOverride<Champion, "levelStates">,
	"target" | "field" | "apply"
> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	levelStates: LevelState[]
}): FieldOverride<Champion, "levelStates"> {
	return {
		...override,
		target: championKey,
		field: "levelStates",
		apply: () => levelStates,
	}
}

/** Sets a champion's `forms`: an override like the others, so it is logged, ranged by patch and validated. */
export function defineForms({
	championKey,
	forms,
	...override
}: Omit<FieldOverride<Champion, "forms">, "target" | "field" | "apply"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	/** The first is the default form, the one Riot's data describes. */
	forms: ChampionForm[]
}): FieldOverride<Champion, "forms"> {
	return {
		...override,
		target: championKey,
		field: "forms",
		apply: () => forms,
	}
}

/** Sets a champion's `skillRules`: an override like the others, so it is logged, ranged by patch and validated. */
export function defineSkillRules({
	championKey,
	skillRules,
	...override
}: Omit<FieldOverride<Champion, "skillRules">, "target" | "field" | "apply"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	skillRules: SkillRules
}): FieldOverride<Champion, "skillRules"> {
	return {
		...override,
		target: championKey,
		field: "skillRules",
		apply: () => skillRules,
	}
}

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
 * Sets the cooldown per rank of some of a champion's abilities: an override like the others, so it
 * is logged, ranged by patch and reported once Riot's data agrees with it.
 */
export function defineCooldowns({
	championKey,
	cooldowns,
	...override
}: Omit<FieldOverride<Champion, "abilities">, "target" | "field" | "apply"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	/** Seconds by rank, rank 1 first. */
	cooldowns: Partial<Record<AbilitySlot, readonly number[]>>
}): FieldOverride<Champion, "abilities"> {
	return {
		...override,
		target: championKey,
		field: "abilities",
		apply: (abilities) => ({
			...abilities,
			spells: abilities.spells.map((spell) => {
				const cooldown = cooldowns[spell.slot]
				return cooldown === undefined
					? spell
					: { ...spell, cooldown: [...cooldown] }
			}) as Champion["abilities"]["spells"],
		}),
	}
}
