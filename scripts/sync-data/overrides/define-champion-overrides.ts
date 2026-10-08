import type {
	AbilityDamage,
	AbilitySlot,
	Champion,
	ChampionForm,
	ChampionSpell,
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

type AbilitiesOverride = Omit<
	FieldOverride<Champion, "abilities">,
	"target" | "field" | "apply"
> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
}

/** What `defineAbilityFixes` changes, by slot; slots it leaves out keep Riot's data. */
export type AbilityFixes = {
	/** Seconds, 0 for none. */
	castTimes?: Partial<Record<AbilitySlot, number>>
	/** Seconds by rank, rank 1 first. */
	cooldowns?: Partial<Record<AbilitySlot, readonly number[]>>
	/** The ability's damage formulas, given the synced ones (a part the sync can't read). */
	damage?: Partial<
		Record<AbilitySlot, (damage: AbilityDamage[]) => AbilityDamage[]>
	>
}

function fixSpell(spell: ChampionSpell, fixes: AbilityFixes): ChampionSpell {
	const castTime = fixes.castTimes?.[spell.slot]
	const cooldown = fixes.cooldowns?.[spell.slot]
	const damage = fixes.damage?.[spell.slot]
	return {
		...spell,
		...(castTime !== undefined && { castTime }),
		...(cooldown && { cooldown: [...cooldown] }),
		...(damage && spell.damage && { damage: damage(spell.damage) }),
	}
}

/**
 * Fixes a champion's abilities in one override: cast times, cooldowns and damage formulas all
 * change `abilities`, so a champion needing more than one kind gets this instead of one of each.
 */
export function defineAbilityFixes({
	championKey,
	castTimes,
	cooldowns,
	damage,
	...override
}: AbilitiesOverride & AbilityFixes): FieldOverride<Champion, "abilities"> {
	const fixes = { castTimes, cooldowns, damage }
	return {
		...override,
		target: championKey,
		field: "abilities",
		apply: (abilities) => ({
			...abilities,
			spells: abilities.spells.map((spell) =>
				fixSpell(spell, fixes),
			) as Champion["abilities"]["spells"],
		}),
	}
}

/**
 * Sets the cast time of some of a champion's abilities (0 is none): an override like the others,
 * so it is logged, ranged by patch and reported once Riot's data agrees with it.
 */
export function defineCastTimes({
	castTimes,
	...override
}: AbilitiesOverride & {
	castTimes: NonNullable<AbilityFixes["castTimes"]>
}): FieldOverride<Champion, "abilities"> {
	return defineAbilityFixes({ ...override, castTimes })
}

/**
 * Sets the cooldown per rank of some of a champion's abilities: an override like the others, so it
 * is logged, ranged by patch and reported once Riot's data agrees with it.
 */
export function defineCooldowns({
	cooldowns,
	...override
}: AbilitiesOverride & {
	cooldowns: NonNullable<AbilityFixes["cooldowns"]>
}): FieldOverride<Champion, "abilities"> {
	return defineAbilityFixes({ ...override, cooldowns })
}
