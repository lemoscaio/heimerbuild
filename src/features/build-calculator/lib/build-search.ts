import { FORM_ID_PATTERN } from "@schemas/champion"
import * as z from "zod/mini"
import {
	type ComboLink,
	normalizeComboChoices,
	readComboItems,
	readComboStart,
	serializeComboItems,
	serializeComboStart,
	TARGET_PARAM_PATTERN,
} from "@/lib/combat/combo-link"
import { FULL_HEALTH, MIN_HEALTH } from "@/lib/effects/current-health"
import type { EffectOverrides } from "@/lib/effects/effect"
import {
	EFFECTS_PARAM_PATTERN,
	serializeEffectOverrides,
} from "@/lib/effects/effect-overrides"
import { GAME_START, MAX_GAME_TIME } from "@/lib/effects/game-time"
import {
	type MatchStacks,
	STACKS_PARAM_PATTERN,
	serializeMatchStacks,
} from "@/lib/effects/match-stacks"
import { RUNES_PARAM_PATTERN } from "@/lib/rune-selection"
import { UNSPENT_LEVEL_MARK } from "@/lib/skill-order-param"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { SUMMONERS_PARAM_PATTERN } from "@/lib/summoner-slots"
import { MAX_ITEMS } from "./build-items"
import {
	BUILD_LINK_MIGRATIONS,
	BUILD_LINK_VERSION,
	migrateBuildLink,
	type RawBuildSearch,
} from "./build-link-migrations"

/** One ability letter per level, level 1 first, `_` for an unspent level ("EQ_E"); checked against the champion's rules later. */
export const SKILLS_PARAM_PATTERN = new RegExp(
	`^[QWER${UNSPENT_LEVEL_MARK}]{1,18}$`,
)

// The router JSON-parses each value: `items=3089` arrives as a number,
// `items=3089,3020` as a string and `items=[3089,3020]` as an array.
const itemIdsSchema = z.pipe(
	z.union([
		z.pipe(
			z.string(),
			z.transform((value) => value.split(",")),
		),
		z.pipe(
			z.number(),
			z.transform((value) => [String(value)]),
		),
		z.pipe(
			z.array(z.union([z.string(), z.number()])),
			z.transform((values) => values.map(String)),
		),
	]),
	z.array(z.string().check(z.regex(/^\d+$/))).check(z.maxLength(MAX_ITEMS)),
)

// `summoners=4,14` arrives as a string; a hand-typed `summoners=4` as a number: Flash in D.
const summonersSchema = z.union([
	z.string().check(z.regex(SUMMONERS_PARAM_PATTERN)),
	z.pipe(
		z.int().check(z.nonnegative()),
		z.transform((value) => `${value},`),
	),
])

// Unreadable tokens are dropped one by one; a value left with none is no value.
const comboSchema = z.pipe(
	z.string(),
	z.transform((value) => serializeComboItems(readComboItems(value))),
)

const comboChoicesSchema = z.pipe(
	z.string(),
	z.transform(normalizeComboChoices),
)

const comboStartSchema = z.pipe(
	z.string(),
	z.transform((value) => serializeComboStart(readComboStart(value))),
)

/** Shareable build in the champion page URL, in the latest link format. Invalid values are dropped, never an error page. */
export const buildSearchSchema = z.object({
	/** The link format version; read links are migrated to it first (`readBuildSearch`). */
	v: z.catch(z.optional(z.literal(BUILD_LINK_VERSION)), undefined),
	lvl: z.catch(
		z.optional(z.int().check(z.gte(MIN_LEVEL), z.lte(MAX_LEVEL))),
		undefined,
	),
	items: z.catch(z.optional(itemIdsSchema), undefined),
	patch: z.catch(
		z.optional(z.string().check(z.regex(/^\d+\.\d+\.\d+$/))),
		undefined,
	),
	/** Page layout: the expanded shop or the expanded combo; absent means the overview. */
	view: z.catch(z.optional(z.enum(["shop", "combo"])), undefined),
	/** Open center tab: the rune page, the skills or the combo; absent means the items. */
	tab: z.catch(z.optional(z.enum(["runes", "skills", "combo"])), undefined),
	/** The champion's form (`mega`); an id the champion does not have means its default form. */
	form: z.catch(
		z.optional(z.string().check(z.regex(FORM_ID_PATTERN))),
		undefined,
	),
	/** Rune page in the compact form of `serializeRuneSelection`; checked against the data later. */
	runes: z.catch(
		z.optional(z.string().check(z.regex(RUNES_PARAM_PATTERN))),
		undefined,
	),
	/** The spent skill points up to the level; levels it leaves out are unspent. */
	skills: z.catch(
		z.optional(z.string().check(z.regex(SKILLS_PARAM_PATTERN))),
		undefined,
	),
	/** The two summoner spells, D then F (`serializeSummonerSlots`); checked against the data later. */
	summoners: z.catch(z.optional(summonersSchema), undefined),
	/** The effects turned on or off against their defaults (`serializeEffectOverrides`); checked against the build later. */
	effects: z.catch(
		z.optional(z.string().check(z.regex(EFFECTS_PARAM_PATTERN))),
		undefined,
	),
	/** Current health in percent of maximum health, which some effects read; absent means full. */
	hp: z.catch(
		z.optional(z.int().check(z.gte(MIN_HEALTH), z.lte(FULL_HEALTH))),
		undefined,
	),
	/** Game time in whole minutes, which some effects read; absent means the game's start. */
	min: z.catch(
		z.optional(z.int().check(z.gte(GAME_START), z.lte(MAX_GAME_TIME))),
		undefined,
	),
	/** The match stacks by source (`serializeMatchStacks`), which some effects read; absent means none. */
	stacks: z.catch(
		z.optional(z.string().check(z.regex(STACKS_PARAM_PATTERN))),
		undefined,
	),
	/** The combo's steps and situation markers, in order (`serializeComboItems`); absent means none. */
	combo: z.catch(z.optional(comboSchema), undefined),
	/** The combo's free mode, on; absent means strict. */
	free: z.catch(z.optional(z.literal(1)), undefined),
	/** Free mode's choices by step (`serializeComboChoices`); absent means the computed outcomes. */
	choices: z.catch(z.optional(comboChoicesSchema), undefined),
	/** The cooldowns the combo starts on (`serializeComboStart`); absent means every one starts ready. */
	start: z.catch(z.optional(comboStartSchema), undefined),
	/** The combo's target: a preset's id or its numbers; absent means the Dummy. Checked by the target later. */
	target: z.catch(
		z.optional(z.string().check(z.regex(TARGET_PARAM_PATTERN))),
		undefined,
	),
})

export type BuildSearch = z.infer<typeof buildSearchSchema>

/** Reads a build link of any version: migrates it to the latest format, then checks it. */
export function readBuildSearch(search: RawBuildSearch): BuildSearch {
	return buildSearchSchema.parse(
		migrateBuildLink(search, BUILD_LINK_MIGRATIONS),
	)
}

export type BuildView = "overview" | "shop" | "combo"

export type BuildTab = "items" | "runes" | "skills" | "combo"

export type BuildState = {
	level: number
	itemIds: readonly string[]
	patch: string | undefined
	view?: BuildView
	tab?: BuildTab
	/** `serializeRuneSelection` output; `undefined` for no runes. */
	runes?: string
	/** A form other than the champion's default; `undefined` for the default. */
	form?: string
	/** The picked skill points; `undefined` for the suggested order. */
	skills?: string
	/** `serializeSummonerSlots` output; `undefined` for two empty slots. */
	summoners?: string
	/** The effects that differ from their defaults; `undefined` or empty for none. */
	effects?: EffectOverrides
	/** Percent of maximum health; `undefined` for full health. 100 stays out of the link too. */
	currentHealth?: number
	/** Whole minutes into the game; `undefined` for its start. 0 stays out of the link too. */
	gameTime?: number
	/** Stacks by source id; `undefined` for none. A 0 count stays out of the link too. */
	matchStacks?: MatchStacks
	/** The combo's target, as the `target` value; `undefined` for the Dummy. */
	target?: string
} & ComboLink

/** The URL search for a build, in the latest link format. Defaults (level 1, no items, overview, items tab, no runes, default form, suggested skills, no summoner spells, default effects, full health, game start, no match stacks, no combo, strict mode, the Dummy) stay out of the URL. */
export function toBuildSearch({
	level,
	itemIds,
	patch,
	view,
	tab,
	runes,
	form,
	skills,
	summoners,
	effects,
	currentHealth,
	gameTime,
	matchStacks,
	combo,
	free,
	choices,
	start,
	target,
}: BuildState): BuildSearch {
	return {
		lvl: level === MIN_LEVEL ? undefined : level,
		items: itemIds.length ? [...itemIds] : undefined,
		patch,
		view: view === "overview" ? undefined : view,
		tab: tab === "items" ? undefined : tab,
		form,
		runes,
		skills,
		summoners,
		effects: serializeEffectOverrides(effects),
		hp: currentHealth === FULL_HEALTH ? undefined : currentHealth,
		min: gameTime === GAME_START ? undefined : gameTime,
		stacks: serializeMatchStacks(matchStacks),
		combo,
		free: free ? 1 : undefined,
		choices,
		start,
		target,
		v: BUILD_LINK_VERSION,
	}
}
