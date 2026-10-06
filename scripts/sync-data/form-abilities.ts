import { ELISE_FORM_ABILITIES } from "./champions/elise"
import { GNAR_FORM_ABILITIES } from "./champions/gnar"
import { JAYCE_FORM_ABILITIES } from "./champions/jayce"
import { JINX_FORM_ABILITIES } from "./champions/jinx"
import { KLED_FORM_ABILITIES } from "./champions/kled"
import { NIDALEE_FORM_ABILITIES } from "./champions/nidalee"
import type { AbilitySlot } from "./schemas/champion"
import type { PatchRange } from "./schemas/patch-range"

/** The form can't cast the ability (Mini Gnar's GNAR!); its rank still counts for the slot. */
export type FormUnavailable = {
	/** What the skills row and tab say: "Unavailable as Mini Gnar". */
	reason: string
	source: string
}

/** How a form shows a slot, when it differs from the ability's Data Dragon look. */
export type FormDisplay = {
	/** Which of the spell's icons (`mImgIconName`, 0 first) the form shows: Cougar Nidalee's R is 1. */
	icon?: number
	/** Rank-up lines taken from the slot's default ability by label, when the spell's own tooltip has none, stale ones or both forms' lines. */
	lines?: readonly string[]
	/** A game text (string table key) whose title names the form's mode and whose main text describes it: "Switcheroo! (Pow-Pow)". */
	modeText?: string
	/** Set in the rules, never inferred from a grey icon (Violent Tendencies has none). */
	unavailable?: FormUnavailable
}

export type FormSpellRule = FormDisplay & {
	/**
	 * The spell object in the CommunityDragon character bin, by the last part of its path. The slot's
	 * own spell ("JinxQ") keeps the ability and changes only how it shows; another one ("JayceShockBlast") swaps it.
	 */
	spell: string
	/** The default ability's description covers both forms, one paragraph each: the default form keeps the first. */
	splitDescription?: true
	/** How the default form shows the slot, when Data Dragon's look is not the game's (Jinx's Q on the minigun). */
	default?: FormDisplay
}

/** The same passive with another icon per form (Jayce's hammer and cannon). */
export type FormPassiveRule = {
	/** The passive's spell object, whose `mImgIconName` lists one icon per form. */
	spell: string
	icon: number
	default?: { icon: number }
}

export type FormAbilityRule = PatchRange & {
	/** Data Dragon string id ("Jayce"). */
	championKey: string
	/** A form of `CHAMPION_FORMS` other than the default ("cannon"). */
	form: string
	/** The slots whose ability or look changes in that form; the rank stays per slot. */
	spells: Partial<Record<AbilitySlot, FormSpellRule>>
	passive?: FormPassiveRule
	/** What changes, and how the ranks follow the slot. */
	reason: string
	source: string
}

/**
 * Abilities another form swaps in. Data Dragon lists one spell per slot; the other form's spells
 * come from the game files, read by the sync like the default ones (README, Game data). One file
 * per champion in `champions/`.
 */
export const FORM_ABILITY_RULES: readonly FormAbilityRule[] = [
	ELISE_FORM_ABILITIES,
	GNAR_FORM_ABILITIES,
	JAYCE_FORM_ABILITIES,
	JINX_FORM_ABILITIES,
	KLED_FORM_ABILITIES,
	NIDALEE_FORM_ABILITIES,
]
