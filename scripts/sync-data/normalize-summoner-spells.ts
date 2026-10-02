import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { DDRAGON_BASE } from "./download"
import { itemMarkupToText } from "./item-text"
import { readJson } from "./read-json"
import { runeMarkupToRichText } from "./rune-text"
import {
	SUMMONER_SPELL_LEVELS,
	type SummonerSpell,
	type SummonerSpellsFile,
	summonerSpellsFileSchema,
} from "./schemas/summoner-spell"

/** Data Dragon's game mode for Summoner's Rift; other modes (ARAM, Arena, Swarm) have their own spells. */
const SUMMONERS_RIFT_MODE = "CLASSIC"

const ddragonSummonerSchema = z.object({
	data: z.record(
		z.string(),
		z.object({
			id: z.string(),
			key: z.string(),
			name: z.string(),
			description: z.string(),
			tooltip: z.string(),
			cooldown: z.array(z.number()).min(1),
			modes: z.array(z.string()),
			image: z.object({ full: z.string() }),
		}),
	),
})

type DdragonSummoner = z.infer<typeof ddragonSummonerSchema>["data"][string]

// Game files omit fields left at their default value. Lists are per rank; index 1 is rank 1.
const perRank = z.array(z.number().nullable())

const formulaPartSchema = z
	.object({
		__type: z.string(),
		mStartValue: z.number().optional(),
		mEndValue: z.number().optional(),
		mLevel1Value: z.number().optional(),
		mInitialBonusPerLevel: z.number().optional(),
		mBreakpoints: z
			.array(
				z.object({
					mLevel: z.number().int(),
					mBonusPerLevelAtAndAfter: z.number().optional(),
					mAdditionalBonusAtThisLevel: z.number().optional(),
				}),
			)
			.optional(),
		mDataValue: z.string().optional(),
		mEffectIndex: z.number().int().optional(),
		mNumber: z.number().optional(),
	})
	.loose()

const calculationSchema = z
	.object({
		__type: z.string(),
		mFormulaParts: z.array(formulaPartSchema).optional(),
		mDisplayAsPercent: z.boolean().optional(),
	})
	.loose()

const spellObjectSchema = z.object({
	mSpell: z.object({
		cooldownTime: perRank,
		DataValues: z
			.array(z.object({ name: z.string(), values: perRank.optional() }))
			.optional(),
		mEffectAmount: z
			.array(z.object({ value: perRank.optional() }).nullable())
			.optional(),
		mSpellCalculations: z.record(z.string(), calculationSchema).nullish(),
		mMaxAmmo: perRank.nullish(),
		mAmmoRechargeTime: perRank.nullish(),
	}),
})

type SpellObject = z.infer<typeof spellObjectSchema>
type FormulaPart = z.infer<typeof formulaPartSchema>

type LevelValues = number[]

const LEVELS = Array.from({ length: SUMMONER_SPELL_LEVELS }, (_, i) => i + 1)

function round(value: number): number {
	// CommunityDragon stores float32 values (0.4000000059604645).
	return Math.round(value * 10_000) / 10_000
}

function constant(value: number): LevelValues {
	return LEVELS.map(() => round(value))
}

/** Rank 1's value of a per-rank list; summoner spells have a single rank. */
function rankOne(list: readonly (number | null)[] | null | undefined) {
	const value = list?.[1]
	return typeof value === "number" ? value : undefined
}

function dataValues(spell: SpellObject["mSpell"]): Map<string, number> {
	const values = new Map<string, number>()
	for (const { name, values: list } of spell.DataValues ?? []) {
		const value = rankOne(list)
		if (value !== undefined) values.set(name.toLowerCase(), value)
	}
	return values
}

/** `ByCharLevelBreakpoints`: the level 1 value, plus a per-level bonus that breakpoints change. */
function breakpointsValue(part: FormulaPart, level: number): number {
	let value = part.mLevel1Value ?? 0
	let bonus = part.mInitialBonusPerLevel ?? 0
	for (let current = 2; current <= level; current++) {
		const breakpoint = part.mBreakpoints?.find((b) => b.mLevel === current)
		bonus = breakpoint?.mBonusPerLevelAtAndAfter ?? bonus
		value += bonus + (breakpoint?.mAdditionalBonusAtThisLevel ?? 0)
	}
	return value
}

/** A formula part's value per level, or undefined for a part that needs more than the level (stats). */
function partValues(
	part: FormulaPart,
	spell: SpellObject["mSpell"],
): LevelValues | undefined {
	switch (part.__type) {
		case "ByCharLevelInterpolationCalculationPart": {
			const start = part.mStartValue ?? 0
			const end = part.mEndValue ?? 0
			const steps = SUMMONER_SPELL_LEVELS - 1
			return LEVELS.map((level) =>
				round(start + ((end - start) * (level - 1)) / steps),
			)
		}
		case "ByCharLevelBreakpointsCalculationPart":
			return LEVELS.map((level) => round(breakpointsValue(part, level)))
		case "NamedDataValueCalculationPart": {
			const value = dataValues(spell).get(part.mDataValue?.toLowerCase() ?? "")
			return value === undefined ? undefined : constant(value)
		}
		case "EffectValueCalculationPart": {
			const effect = spell.mEffectAmount?.[(part.mEffectIndex ?? 0) - 1]
			const value = rankOne(effect?.value)
			return value === undefined ? undefined : constant(value)
		}
		case "NumberCalculationPart":
			return part.mNumber === undefined ? undefined : constant(part.mNumber)
		default:
			return undefined
	}
}

type Calculated = { values: LevelValues; percent: boolean }

/** A spell calculation summed per level; undefined when one of its parts is not supported. */
function calculationValues(
	spell: SpellObject["mSpell"],
	name: string,
): Calculated | undefined {
	const entry = Object.entries(spell.mSpellCalculations ?? {}).find(
		([key]) => key.toLowerCase() === name,
	)?.[1]
	if (entry?.__type !== "GameCalculation" || !entry.mFormulaParts?.length) {
		return undefined
	}
	const parts = entry.mFormulaParts.map((part) => partValues(part, spell))
	if (parts.some((part) => part === undefined)) return undefined
	return {
		values: LEVELS.map((_, index) =>
			round(parts.reduce((sum, part) => sum + (part?.[index] ?? 0), 0)),
		),
		percent: entry.mDisplayAsPercent === true,
	}
}

// `{{ shieldstrength }}`, `{{ grievousamount*100 }}`: one value, maybe scaled.
const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*(?:\*\s*(-?\d+(?:\.\d+)?)\s*)?\}\}/gi

function formatNumber(value: number): string {
	return String(Math.round(value * 100) / 100)
}

/** "40" for a value that never changes, "70–475" for one that grows with level. */
function formatRange(values: LevelValues): string {
	const first = formatNumber(values[0] ?? 0)
	const last = formatNumber(values.at(-1) ?? 0)
	return first === last ? first : `${first}–${last}`
}

type SpellValues = {
	values: Record<string, LevelValues>
	longDescription: string
}

/**
 * Every data value of the spell, plus the calculations its tooltip shows, per level; and the
 * tooltip with its placeholders filled. A placeholder the game files cannot fill fails the sync.
 */
export function spellValues(
	summoner: Pick<DdragonSummoner, "id" | "tooltip">,
	spell: SpellObject["mSpell"],
): SpellValues {
	const values: Record<string, LevelValues> = {}
	for (const [name, value] of dataValues(spell)) {
		if (/^[a-z0-9]+$/.test(name)) values[name] = constant(value)
	}
	const longDescription = summoner.tooltip.replace(
		PLACEHOLDER,
		(placeholder, rawName: string, multiplier?: string) => {
			const name = rawName.toLowerCase()
			const calculated = calculationValues(spell, name)
			const found = calculated?.values ?? values[name]
			if (!found) {
				throw new Error(
					`${summoner.id}: the game files have no value for ${placeholder} in its tooltip`,
				)
			}
			values[name] = found
			const scale = Number(multiplier ?? (calculated?.percent ? 100 : 1))
			const text = formatRange(found.map((value) => value * scale))
			return calculated?.percent ? `${text}%` : text
		},
	)
	return { values, longDescription }
}

function charges(spell: SpellObject["mSpell"]): SummonerSpell["charges"] {
	const count = rankOne(spell.mMaxAmmo)
	const rechargeTime = rankOne(spell.mAmmoRechargeTime)
	if (count === undefined || count < 2 || rechargeTime === undefined) {
		return undefined
	}
	return { count, rechargeTime }
}

function findSpellObject(sharedBin: unknown, id: string): SpellObject {
	const entry = (sharedBin as Record<string, unknown>)[`Shared/Spells/${id}`]
	if (!entry) throw new Error(`${id} is missing from the game files`)
	return spellObjectSchema.parse(entry)
}

function toSummonerSpell(
	summoner: DdragonSummoner,
	sharedBin: unknown,
	version: string,
): SummonerSpell {
	const { mSpell: spell } = findSpellObject(sharedBin, summoner.id)
	const [cooldown] = summoner.cooldown
	if (cooldown === undefined || cooldown !== rankOne(spell.cooldownTime)) {
		throw new Error(
			`${summoner.id}: Data Dragon cooldown ${cooldown} differs from the game files (${rankOne(spell.cooldownTime)})`,
		)
	}
	const { values, longDescription } = spellValues(summoner, spell)
	const spellCharges = charges(spell)
	return {
		id: summoner.key,
		key: summoner.id,
		name: summoner.name,
		icon: `${DDRAGON_BASE}/${version}/img/spell/${summoner.image.full}`,
		cooldown,
		...(spellCharges && { charges: spellCharges }),
		description: itemMarkupToText(summoner.description),
		longDescription: runeMarkupToRichText(longDescription),
		values,
	}
}

/**
 * The Summoner's Rift summoner spells, by name: Data Dragon's list (mode `CLASSIC`) with the
 * values from the CommunityDragon game files (`shared.cdtb.bin.json`).
 */
export function normalizeSummonerSpells(
	summonerJson: unknown,
	sharedBin: unknown,
	version: string,
): SummonerSpellsFile {
	const spells = Object.values(ddragonSummonerSchema.parse(summonerJson).data)
		.filter((summoner) => summoner.modes.includes(SUMMONERS_RIFT_MODE))
		.map((summoner) => toSummonerSpell(summoner, sharedBin, version))
		.sort((a, b) => a.name.localeCompare(b.name))
	return summonerSpellsFileSchema.parse({ version, spells })
}

export type SummonerSpellsOutputSummary = { spells: number; bytes: number }

/** Normalizes the cached summoner spell data and writes `summoner-spells.json` into `outDir`. */
export async function writeSummonerSpells(
	cacheDir: string,
	outDir: string,
	version: string,
): Promise<SummonerSpellsOutputSummary> {
	const file = normalizeSummonerSpells(
		await readJson(join(cacheDir, "ddragon/summoner.json")),
		await readJson(join(cacheDir, "cdragon/shared.cdtb.bin.json")),
		version,
	)
	const text = JSON.stringify(file)
	await writeFile(join(outDir, "summoner-spells.json"), text)
	return { spells: file.spells.length, bytes: Buffer.byteLength(text) }
}
