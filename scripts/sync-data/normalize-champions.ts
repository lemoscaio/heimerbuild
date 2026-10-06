import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { type ChampionCoverage, damageCoverage } from "./damage-coverage"
import type { GameStrings } from "./damage-formulas"
import { FORM_ABILITY_RULES, type FormAbilityRule } from "./form-abilities"
import {
	ddragonPassiveSchema,
	ddragonSpellSchema,
	normalizeAbilities,
} from "./normalize-abilities"
import { normalizeFormAbilities } from "./normalize-form-abilities"
import {
	applyOverrides,
	type OverrideReport,
} from "./overrides/apply-overrides"
import { CHAMPION_OVERRIDES } from "./overrides/champion-overrides"
import type { ChampionOverride } from "./overrides/define-champion-overrides"
import { RANK_STAT_RULES, type RankStatRule } from "./rank-stats"
import { readJson } from "./read-json"
import {
	type Champion,
	type ChampionSummary,
	championIndexSchema,
	championSchema,
	formAbilitiesFitForms,
	skillRulesFitAbilities,
} from "./schemas/champion"
import { isInPatchRange } from "./schemas/patch-range"
import { toCommunityDragonPatch } from "./version"

const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn"
// Lillia has the longest melee range (325), Urgot the shortest ranged one (350).
const MAX_MELEE_RANGE = 325

const ddragonSummarySchema = z.object({
	id: z.string(),
	key: z.string().regex(/^\d+$/),
	name: z.string(),
	title: z.string(),
	tags: z.array(z.string()),
	image: z.object({ full: z.string() }),
})

const ddragonListSchema = z.object({
	data: z.record(z.string(), ddragonSummarySchema),
})

const ddragonStatsSchema = z.object({
	hp: z.number(),
	hpperlevel: z.number(),
	mp: z.number(),
	mpperlevel: z.number(),
	movespeed: z.number(),
	armor: z.number(),
	armorperlevel: z.number(),
	spellblock: z.number(),
	spellblockperlevel: z.number(),
	attackrange: z.number(),
	hpregen: z.number(),
	hpregenperlevel: z.number(),
	mpregen: z.number(),
	mpregenperlevel: z.number(),
	crit: z.number(),
	critperlevel: z.number(),
	attackdamage: z.number(),
	attackdamageperlevel: z.number(),
	attackspeedperlevel: z.number(),
	attackspeed: z.number(),
})

const ddragonDetailSchema = z.object({
	data: z.record(
		z.string(),
		ddragonSummarySchema.extend({
			lore: z.string(),
			partype: z.string(),
			stats: ddragonStatsSchema,
			passive: ddragonPassiveSchema,
			spells: z.array(ddragonSpellSchema),
		}),
	),
})

const modifiableFloat = z.object({ baseValue: z.number() }).optional()

// Game files omit fields left at their default value, so every stat is optional.
const characterRecordSchema = z.object({
	__type: z.literal("CharacterRecord"),
	damagePerLevelModifiable: modifiableFloat,
	attackSpeedRatioModifiable: modifiableFloat,
	purchaseIdentities: z.array(z.string()).optional(),
	// 1 for champions whose Adaptive Force defaults to ability power, absent otherwise.
	mAdaptiveForceToAbilityPowerWeight: z.number().optional(),
})

type CharacterRecord = z.infer<typeof characterRecordSchema>

function round(value: number): number {
	// CommunityDragon stores float32 values (0.6579999923706055).
	return Math.round(value * 10_000) / 10_000
}

function iconUrl(version: string, image: string): string {
	return `${DDRAGON_CDN}/${version}/img/champion/${image}`
}

function toResource(partype: string): string {
	return partype.trim().toUpperCase().replace(/\s+/g, "_") || "NONE"
}

function findRootRecord(characterBin: unknown): CharacterRecord {
	if (!characterBin || typeof characterBin !== "object") {
		throw new Error("character bin is not an object")
	}
	const roots = Object.entries(characterBin).filter(([path]) =>
		path.endsWith("/CharacterRecords/Root"),
	)
	if (roots.length !== 1) {
		throw new Error(`expected 1 CharacterRecords/Root, found ${roots.length}`)
	}
	return characterRecordSchema.parse(roots[0]?.[1])
}

function attackType(
	record: CharacterRecord,
	attackRange: number,
): Champion["attackType"] {
	const identities = record.purchaseIdentities ?? []
	// Form-swappers (Jayce, Gnar, Kayle, Elise, Nidalee) list both; use the starting range.
	if (identities.length === 1 && identities[0] === "Melee") return "melee"
	if (identities.length === 1 && identities[0] === "Ranged") return "ranged"
	return attackRange > MAX_MELEE_RANGE ? "ranged" : "melee"
}

/** Builds the home-grid index from Data Dragon `champion.json`, sorted by name. */
export function buildChampionIndex(
	championList: unknown,
	version: string,
): ChampionSummary[] {
	const { data } = ddragonListSchema.parse(championList)
	const index = Object.values(data)
		.map((champion) => ({
			key: champion.id,
			id: Number(champion.key),
			name: champion.name,
			title: champion.title,
			roles: champion.tags.map((tag) => tag.toUpperCase()),
			icon: iconUrl(version, champion.image.full),
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "en"))
	return championIndexSchema.parse(index)
}

export type NormalizedChampion = {
	champion: Champion
	/** Rank-up tooltip lines left out because the data lacks their values. */
	skippedAbilityLines: number
}

export type NormalizeChampionOptions = {
	/** Every champion's rank stat rules; each champion takes its own. */
	rankStatRules?: readonly RankStatRule[]
	/** Every champion's form ability rules in force on the patch; each champion takes its own. */
	formAbilityRules?: readonly FormAbilityRule[]
	/** The game's texts, which name the spells another form swaps in. */
	strings?: GameStrings
}

/** Merges Data Dragon `champion/<Id>.json` with the CommunityDragon character bin. */
export function normalizeChampion(
	detail: unknown,
	characterBin: unknown,
	version: string,
	options: NormalizeChampionOptions = {},
): Champion {
	return normalizeChampionWithReport(detail, characterBin, version, options)
		.champion
}

/** `normalizeChampion`, plus how many rank-up tooltip lines it could not resolve. */
export function normalizeChampionWithReport(
	detail: unknown,
	characterBin: unknown,
	version: string,
	{
		rankStatRules = RANK_STAT_RULES,
		formAbilityRules = [],
		strings = () => undefined,
	}: NormalizeChampionOptions = {},
): NormalizedChampion {
	const champions = Object.values(ddragonDetailSchema.parse(detail).data)
	const [champion] = champions
	if (!champion || champions.length !== 1) {
		throw new Error(`expected 1 champion, found ${champions.length}`)
	}
	const record = findRootRecord(characterBin)
	const stats = champion.stats
	const bin = characterBin as Record<string, unknown>
	const normalizedAbilities = normalizeAbilities(
		{
			partype: champion.partype,
			passive: champion.passive,
			spells: champion.spells,
		},
		bin,
		version,
		{
			rankStatRules: rankStatRules.filter(
				({ championKey }) => championKey === champion.id,
			),
			strings,
		},
	)
	const { rankStats } = normalizedAbilities
	const { abilities, skippedLines: skippedFormLines } = normalizeFormAbilities(
		normalizedAbilities.abilities,
		formAbilityRules.filter(({ championKey }) => championKey === champion.id),
		{
			bin,
			strings,
			partype: champion.partype,
			cdragonPatch: toCommunityDragonPatch(version),
		},
	)
	const skippedLines = normalizedAbilities.skippedLines + skippedFormLines

	const normalized = championSchema.parse({
		key: champion.id,
		id: Number(champion.key),
		name: champion.name,
		title: champion.title,
		roles: champion.tags.map((tag) => tag.toUpperCase()),
		icon: iconUrl(version, champion.image.full),
		lore: champion.lore,
		attackType: attackType(record, stats.attackrange),
		resource: toResource(champion.partype),
		adaptiveType:
			(record.mAdaptiveForceToAbilityPowerWeight ?? 0) >= 0.5 ? "ap" : "ad",
		stats: {
			health: { base: stats.hp, perLevel: stats.hpperlevel },
			healthRegen: { base: stats.hpregen, perLevel: stats.hpregenperlevel },
			mana: { base: stats.mp, perLevel: stats.mpperlevel },
			manaRegen: { base: stats.mpregen, perLevel: stats.mpregenperlevel },
			armor: { base: stats.armor, perLevel: stats.armorperlevel },
			magicResist: {
				base: stats.spellblock,
				perLevel: stats.spellblockperlevel,
			},
			attackDamage: {
				base: stats.attackdamage,
				perLevel: round(
					record.damagePerLevelModifiable?.baseValue ??
						stats.attackdamageperlevel,
				),
			},
			attackSpeed: {
				base: stats.attackspeed,
				perLevelPercent: stats.attackspeedperlevel,
				ratio: round(
					record.attackSpeedRatioModifiable?.baseValue ?? stats.attackspeed,
				),
			},
			critChance: { base: stats.crit, perLevel: stats.critperlevel },
			movementSpeed: { base: stats.movespeed, perLevel: 0 },
			attackRange: { base: stats.attackrange, perLevel: 0 },
		},
		abilities,
		...(rankStats.length ? { rankStats } : {}),
	})
	return { champion: normalized, skippedAbilityLines: skippedLines }
}

export type ChampionOutputSummary = {
	champions: number
	/** Rank-up tooltip lines left out because the data lacks their values, over all champions. */
	skippedAbilityLines: number
	indexBytes: number
	totalBytes: number
	overrides: OverrideReport
	/** How much of each ability's damage the formulas read. */
	damageCoverage: ChampionCoverage[]
}

export type WriteChampionsOptions = {
	overrides?: readonly ChampionOverride[]
	rankStatRules?: readonly RankStatRule[]
	formAbilityRules?: readonly FormAbilityRule[]
}

const stringTableSchema = z.object({
	entries: z.record(z.string(), z.string()),
})

/** The game's English texts by lowercase key (CommunityDragon `lol.stringtable.json`). */
async function readGameStrings(cacheDir: string): Promise<GameStrings> {
	const { entries } = stringTableSchema.parse(
		await readJson(join(cacheDir, "cdragon/lol.stringtable.json")),
	)
	return (key) => entries[key]
}

/** A rank stat on a slot whose ability changes with the form would hold in both forms. */
function assertRankStatsKeepTheirForm(
	rankStatRules: readonly RankStatRule[],
	formAbilityRules: readonly FormAbilityRule[],
): void {
	for (const { championKey, slot } of rankStatRules) {
		const swapped = formAbilityRules.find(
			(rule) => rule.championKey === championKey && rule.spells[slot],
		)
		if (swapped) {
			throw new Error(
				`rank stat rule ${championKey} ${slot}: the ${swapped.form} form swaps that ability, so the stat would hold in both forms`,
			)
		}
	}
}

/**
 * Normalizes every cached champion, applies the overrides, then writes `champions.json` and
 * `champions/<key>.json` into `outDir`. Nothing is written unless every champion validates.
 */
export async function writeChampions(
	cacheDir: string,
	outDir: string,
	version: string,
	{
		overrides = CHAMPION_OVERRIDES,
		rankStatRules = RANK_STAT_RULES,
		formAbilityRules = FORM_ABILITY_RULES,
	}: WriteChampionsOptions = {},
): Promise<ChampionOutputSummary> {
	const index = buildChampionIndex(
		await readJson(join(cacheDir, "ddragon/champion.json")),
		version,
	)
	for (const { championKey, slot } of rankStatRules) {
		if (!index.some(({ key }) => key === championKey)) {
			throw new Error(`rank stat rule ${championKey} ${slot}: no such champion`)
		}
	}
	const formRules = formAbilityRules.filter((rule) =>
		isInPatchRange(version, rule),
	)
	for (const { championKey, form } of formRules) {
		if (!index.some(({ key }) => key === championKey)) {
			throw new Error(
				`form ability rule ${championKey} ${form}: no such champion`,
			)
		}
	}
	assertRankStatsKeepTheirForm(rankStatRules, formRules)
	// 31 MB of texts: the forms' spell names and every tooltip's damage calculations.
	const strings = await readGameStrings(cacheDir)
	const results = await Promise.all(
		index.map(async ({ key }) => {
			try {
				return normalizeChampionWithReport(
					await readJson(join(cacheDir, `ddragon/champion/${key}.json`)),
					await readJson(join(cacheDir, `cdragon/characters/${key}.bin.json`)),
					version,
					{ rankStatRules, formAbilityRules: formRules, strings },
				)
			} catch (error) {
				throw new Error(`${key}: ${(error as Error).message}`, {
					cause: error,
				})
			}
		}),
	)
	const normalized = results.map(({ champion }) => champion)
	const applied = applyOverrides(normalized, overrides, {
		version,
		kind: "champion",
		idOf: (champion) => champion.key,
	})
	const champions = applied.entities.map((champion) => {
		const result = championSchema.safeParse(champion)
		if (!result.success)
			throw new Error(`${champion.key}: ${result.error.message}`)
		if (!formAbilitiesFitForms(result.data)) {
			throw new Error(
				`${champion.key}: abilities for a form the champion lacks; check FORM_ABILITY_RULES against overrides/champion-forms.ts`,
			)
		}
		if (!skillRulesFitAbilities(result.data)) {
			throw new Error(
				`${champion.key}: an ability rank has no level to unlock at; add skill rules (overrides/champion-skill-rules.ts)`,
			)
		}
		return result.data
	})

	const championsDir = join(outDir, "champions")
	await rm(championsDir, { recursive: true, force: true })
	await mkdir(championsDir, { recursive: true })

	const indexText = JSON.stringify(index)
	let totalBytes = Buffer.byteLength(indexText)
	await writeFile(join(outDir, "champions.json"), indexText)
	for (const champion of champions) {
		const text = JSON.stringify(champion)
		totalBytes += Buffer.byteLength(text)
		await writeFile(join(championsDir, `${champion.key}.json`), text)
	}
	return {
		champions: champions.length,
		skippedAbilityLines: results.reduce(
			(sum, { skippedAbilityLines }) => sum + skippedAbilityLines,
			0,
		),
		indexBytes: Buffer.byteLength(indexText),
		totalBytes,
		overrides: applied.report,
		damageCoverage: damageCoverage(champions),
	}
}
