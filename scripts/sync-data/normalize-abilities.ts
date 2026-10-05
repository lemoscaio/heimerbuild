import { z } from "zod"
import { type GameStrings, spellCombatFields } from "./damage-formulas"
import { type RankStatRule, rankStatValues } from "./rank-stats"
import {
	ABILITY_SLOTS,
	type AbilityRankValue,
	type AbilitySlot,
	type ChampionAbilities,
	type ChampionSpell,
	type RankStat,
} from "./schemas/champion"

const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn"
// Summoner's Rift, the only map the app builds for.
const SUMMONERS_RIFT_MAP_ID = 11

export const ddragonPassiveSchema = z.object({
	name: z.string(),
	description: z.string(),
	image: z.object({ full: z.string() }),
})

export const ddragonSpellSchema = z.object({
	name: z.string(),
	description: z.string(),
	maxrank: z.number().int(),
	cooldown: z.array(z.number()),
	cost: z.array(z.number()),
	resource: z.string().optional(),
	leveltip: z
		.object({ label: z.array(z.string()), effect: z.array(z.string()) })
		.optional(),
	image: z.object({ full: z.string() }),
})

export type DdragonAbilities = {
	/** Data Dragon `partype` ("Mana", "Energy"), the `abilityresourcename` of the texts. */
	partype: string
	passive: z.infer<typeof ddragonPassiveSchema>
	spells: z.infer<typeof ddragonSpellSchema>[]
}

// Game files omit fields left at their default value, so every field is optional.
const perRankArray = z.array(z.number().nullable()).optional()

const spellObjectSchema = z.object({
	mSpell: z
		.object({
			DataValues: z
				.array(z.object({ name: z.string(), values: perRankArray }))
				.optional(),
			mEffectAmount: z
				.array(z.object({ value: perRankArray }).nullable())
				.optional(),
			castRange: perRankArray,
			mAmmoRechargeTime: perRankArray,
			mMaxAmmo: perRankArray,
			// Read for the spells another form swaps in, which Data Dragon lacks.
			cooldownTime: perRankArray,
			/** From rank 1, unlike the other lists. */
			mana: z.array(z.number()).optional(),
			mCastTime: z.number().optional(),
			spellCastTime: z.number().optional(),
			/** The tooltip's calculations by name; read by `damage-formulas.ts`. */
			mSpellCalculations: z.record(z.string(), z.unknown()).optional(),
			mImgIconName: z.array(z.string()).optional(),
			mClientData: z
				.object({
					mTooltipData: z
						.object({
							mObjectName: z.string().optional(),
							mLocKeys: z
								.object({
									keyName: z.string().optional(),
									keySummary: z.string().optional(),
									keyTooltip: z.string().optional(),
								})
								.optional(),
						})
						.optional(),
				})
				.optional(),
		})
		.optional(),
})

const recommendationSchema = z.object({
	MapId: z.number().optional(),
	IsDefaultRecommendation: z.boolean().optional(),
	mDefaultPriority: z.array(z.number().int()).optional(),
	mEarlyLevelOverrides: z.array(z.number().int()).optional(),
})

export type SpellObject = z.infer<typeof spellObjectSchema>

/** A spell's values by lowercase name; index = rank (index 0 is rank 0), as in the game files. */
export type SpellValues = Map<string, readonly (number | null)[]>

export function round(value: number): number {
	// CommunityDragon stores float32 values (0.07999999821186066).
	return Math.round(value * 10_000) / 10_000
}

/** Data Dragon descriptions carry the client's markup (`<br>`, `<status>`, `%i:OnHit%`). */
export function plainText(markup: string): string {
	return markup
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/%i:\w+%/g, "")
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

function entriesOfType(bin: Record<string, unknown>, type: string) {
	return Object.entries(bin).filter(
		([, value]) =>
			!!value &&
			typeof value === "object" &&
			(value as { __type?: unknown }).__type === type,
	)
}

/** The game files' spell whose path ends with `/<name>` ("JayceShockBlast"), or undefined. */
export function findSpellObject(
	bin: Record<string, unknown>,
	name: string,
): SpellObject | undefined {
	const suffix = `/${name}`.toLowerCase()
	const found = entriesOfType(bin, "SpellObject").filter(([path]) =>
		path.toLowerCase().endsWith(suffix),
	)
	if (found.length > 1) throw new Error(`several SpellObjects for ${name}`)
	return found[0] && spellObjectSchema.parse(found[0][1])
}

function rootRecord(bin: Record<string, unknown>) {
	return entriesOfType(bin, "CharacterRecord").find(([path]) =>
		path.endsWith("/CharacterRecords/Root"),
	)?.[1]
}

/** The passive's spell in the game files (`mCharacterPassiveSpell`), when the record names one. */
function findPassiveObject(
	bin: Record<string, unknown>,
): SpellObject | undefined {
	const path = z
		.object({ mCharacterPassiveSpell: z.string().optional() })
		.parse(rootRecord(bin) ?? {}).mCharacterPassiveSpell
	const found = path ? bin[path] : undefined
	return found ? spellObjectSchema.parse(found) : undefined
}

/** The game files' spell for each slot, through the character record's `spellNames`. */
function findSpellObjects(bin: Record<string, unknown>): SpellObject[] {
	const root = rootRecord(bin)
	const spellNames = z
		.object({ spellNames: z.array(z.string()).min(ABILITY_SLOTS.length) })
		.parse(root).spellNames
	const spellObjects = entriesOfType(bin, "SpellObject")
	return ABILITY_SLOTS.map((slot, index) => {
		const suffix = `/${spellNames[index]}`.toLowerCase()
		const found = spellObjects.find(([path]) =>
			path.toLowerCase().endsWith(suffix),
		)
		if (!found) throw new Error(`no SpellObject for ${slot} (${suffix})`)
		return spellObjectSchema.parse(found[1])
	})
}

export function spellValues(spellObject: SpellObject): SpellValues {
	const spell = spellObject.mSpell
	const values: SpellValues = new Map()
	const add = (name: string, list: readonly (number | null)[] | undefined) => {
		if (list && !values.has(name)) values.set(name, list)
	}
	for (const { name, values: list } of spell?.DataValues ?? []) {
		add(name.toLowerCase(), list)
	}
	for (const [index, effect] of (spell?.mEffectAmount ?? []).entries()) {
		add(`e${index + 1}`, effect?.value)
	}
	add("castrange", spell?.castRange)
	add("ammorechargetime", spell?.mAmmoRechargeTime)
	add("maxammo", spell?.mMaxAmmo)
	return values
}

// `{{ basedamage }}`, `{{ passivemovespeedbonus*100.000000 }}%`: one value, maybe scaled, maybe a percent.
const RANK_VALUE_PATTERN =
	/^\{\{\s*([a-z0-9_]+)\s*(?:\*\s*(-?\d+(?:\.\d+)?)\s*)?\}\}(%?)$/i

export type RankValueContext = {
	maxRank: number
	cooldown: readonly number[]
	cost: readonly number[]
	values: SpellValues
}

/** One value per rank for a tooltip name, or undefined when the data does not have it. */
function valuesPerRank(
	name: string,
	{ maxRank, cooldown, cost, values }: RankValueContext,
): number[] | undefined {
	// Data Dragon's own lists start at rank 1; the game files' lists at rank 0.
	if (name === "cooldown") return [...cooldown]
	if (name === "cost") return [...cost]
	const list = values.get(name)
	if (!list) return undefined
	const ranks = list.slice(1, maxRank + 1)
	if (ranks.length !== maxRank || ranks.some((value) => value === null)) {
		return undefined
	}
	return ranks as number[]
}

/**
 * The rank-up tooltip's lines ("Damage 80 → 125") from Data Dragon's `leveltip`, with the values
 * from the game files. A line whose value the data does not have is left out.
 */
export type Leveltip = z.infer<typeof ddragonSpellSchema>["leveltip"]

export function rankValues(
	leveltip: Leveltip,
	{ partype, ...context }: RankValueContext & { partype: string },
): { lines: AbilityRankValue[]; skipped: number } {
	const lines: AbilityRankValue[] = []
	let skipped = 0
	for (const [index, rawLabel] of (leveltip?.label ?? []).entries()) {
		const label = rawLabel.replace(/@AbilityResourceName@/g, partype).trim()
		const current = leveltip?.effect[index]?.split("->")[0]?.trim() ?? ""
		const match = RANK_VALUE_PATTERN.exec(current)
		const values = match?.[1] && valuesPerRank(match[1].toLowerCase(), context)
		if (!match || !values || !label || label.includes("@")) {
			skipped++
			continue
		}
		const multiplier = Number(match[2] ?? 1)
		lines.push({
			label,
			values: values.map((value) => round(value * multiplier)),
			...(match[3] ? { unit: "%" as const } : {}),
		})
	}
	return { lines, skipped }
}

/** "{{ cost }} Mana" becomes values and a unit; a text without values stays text; anything else is dropped. */
export function spellCost(
	resource: string | undefined,
	{ cost, partype }: { cost: readonly number[]; partype: string },
): ChampionSpell["cost"] {
	const text = (resource ?? "")
		.replace(/\{\{\s*abilityresourcename\s*\}\}/gi, partype)
		.trim()
	const withCost = /^\{\{\s*cost\s*\}\}(.*)$/i.exec(text)
	if (withCost && !withCost[1]?.includes("{{")) {
		return { values: [...cost], unit: withCost[1]?.trim() ?? "" }
	}
	if (text && !text.includes("{{")) return { text }
	return undefined
}

function recommendedOrder(
	bin: Record<string, unknown>,
): ChampionAbilities["recommendedOrder"] {
	const recommendation = entriesOfType(bin, "RecSpellRankUpInfoList")
		.flatMap(([, list]) =>
			z
				.object({ RecSpellRankUpInfos: z.array(recommendationSchema) })
				.parse(list)
				.RecSpellRankUpInfos.filter(
					({ MapId, IsDefaultRecommendation }) =>
						MapId === SUMMONERS_RIFT_MAP_ID && IsDefaultRecommendation,
				),
		)
		.at(0)
	if (!recommendation) return undefined
	const toSlots = (indexes: readonly number[]) =>
		indexes.map((index) => {
			const slot = ABILITY_SLOTS[index]
			if (!slot) throw new Error(`recommended order has ability ${index}`)
			return slot
		})
	const { mDefaultPriority, mEarlyLevelOverrides = [] } = recommendation
	return {
		firstPoints: toSlots(mEarlyLevelOverrides),
		...(mDefaultPriority ? { priority: toSlots(mDefaultPriority) } : {}),
	}
}

export type NormalizedAbilities = {
	abilities: ChampionAbilities
	/** The `rankStatRules` resolved against the game files. */
	rankStats: RankStat[]
	/** Rank-up tooltip lines left out because the data lacks their values. */
	skippedLines: number
}

export type NormalizeAbilitiesOptions = {
	/** This champion's `RANK_STAT_RULES`. */
	rankStatRules?: readonly RankStatRule[]
	/** The game's texts, whose tooltips name the damage calculations; without them, no damage is read. */
	strings?: GameStrings
}

/** Merges Data Dragon's passive and spells with the game files' per-rank values. Pure. */
export function normalizeAbilities(
	{ partype, passive, spells }: DdragonAbilities,
	characterBin: Record<string, unknown>,
	version: string,
	{
		rankStatRules = [],
		strings = () => undefined,
	}: NormalizeAbilitiesOptions = {},
): NormalizedAbilities {
	if (spells.length !== ABILITY_SLOTS.length) {
		throw new Error(`expected 4 spells, found ${spells.length}`)
	}
	const spellObjects = findSpellObjects(characterBin)
	const valuesBySlot = spellObjects.map(spellValues)
	const passiveObject = findPassiveObject(characterBin)
	const combat = {
		strings,
		findSpell: (name: string) => findSpellObject(characterBin, name),
		spellValues,
	}
	let skippedLines = 0
	const normalized = ABILITY_SLOTS.map((slot, index): ChampionSpell => {
		const spell = spells[index] as (typeof spells)[number]
		const context = {
			maxRank: spell.maxrank,
			cooldown: spell.cooldown,
			cost: spell.cost,
			values: valuesBySlot[index] as SpellValues,
		}
		const { lines, skipped } = rankValues(spell.leveltip, {
			...context,
			partype,
		})
		skippedLines += skipped
		const cost = spellCost(spell.resource, { cost: spell.cost, partype })
		return {
			slot: slot satisfies AbilitySlot,
			name: spell.name,
			description: plainText(spell.description),
			icon: `${DDRAGON_CDN}/${version}/img/spell/${spell.image.full}`,
			maxRank: spell.maxrank,
			cooldown: [...spell.cooldown],
			...(cost ? { cost } : {}),
			rankValues: lines,
			...spellCombatFields(spellObjects[index] as SpellObject, {
				...combat,
				maxRank: spell.maxrank,
			}),
		}
	})
	const order = recommendedOrder(characterBin)
	const rankStats = rankStatRules.map((rule): RankStat => {
		const index = ABILITY_SLOTS.indexOf(rule.slot)
		return {
			slot: rule.slot,
			stat: rule.stat,
			values: rankStatValues(
				rule,
				valuesBySlot[index]?.get(rule.dataValue.toLowerCase()),
				spells[index]?.maxrank ?? 0,
			),
		}
	})
	return {
		abilities: {
			passive: {
				name: passive.name,
				description: plainText(passive.description),
				icon: `${DDRAGON_CDN}/${version}/img/passive/${passive.image.full}`,
				...(passiveObject && spellCombatFields(passiveObject, combat)),
			},
			spells: normalized as ChampionAbilities["spells"],
			...(order ? { recommendedOrder: order } : {}),
		},
		rankStats,
		skippedLines,
	}
}
