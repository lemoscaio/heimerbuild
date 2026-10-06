import type { SpellObject, SpellValues } from "./normalize-abilities"
import {
	type AbilityDamage,
	CHAMPION_LEVELS,
	type DamageType,
	type FormulaPart,
	type FormulaStat,
	type FormulaValue,
} from "./schemas/champion"

/**
 * The game's stat ids in calculation parts (`mStat`, absent is 0), checked against the wiki's
 * ratios: Ezreal's Q reads 2 (130% AD), Rammus's W 1 and 6, Braum's Q 12 (maximum health).
 */
const GAME_STATS: Readonly<Record<number, FormulaStat>> = {
	0: "abilityPower",
	1: "armor",
	2: "attackDamage",
	6: "magicResist",
	12: "health",
}

/** `mStatFormula`: absent or 0 reads the total, 1 the base part, 2 the bonus part. */
const STAT_PARTS: Readonly<Record<number, "base" | "bonus" | undefined>> = {
	0: undefined,
	1: "base",
	2: "bonus",
}

/** Part types the formulas don't read yet, by what the coverage report calls them. */
const UNREAD_PARTS: Readonly<Record<string, string>> = {
	SumOfSubPartsCalculationPart: "summed sub-parts",
	ProductOfSubPartsCalculationPart: "multiplied sub-parts",
	ClampSubPartsCalculationPart: "clamped sub-parts",
	BuffCounterByNamedDataValueCalculationPart: "a buff counter",
	BuffCounterByCoefficientCalculationPart: "a buff counter",
	ByCharLevelFormulaCalculationPart: "a per-level table",
	EffectValueCalculationPart: "an effect value",
	AbilityResourceByCoefficientCalculationPart: "the ability resource",
	CooldownMultiplierCalculationPart: "the cooldown",
	PercentageOfBuffNameElapsed: "a buff's elapsed time",
}

type Part = Record<string, unknown> & { __type?: string }

/** The game's text by lowercase key, from CommunityDragon's `lol.stringtable.json`. */
export type GameStrings = (key: string) => string | undefined

function round(value: number): number {
	// CommunityDragon stores float32 values (1.2999999523162842).
	return Math.round(value * 10_000) / 10_000
}

/** What a formula reads: the spell's values, its other calculations and its ranks (none for a passive). */
export type FormulaContext = {
	values: SpellValues
	calculations: Readonly<Record<string, unknown>>
	/** The ability's max rank; absent for a passive, whose values must not change by rank. */
	maxRank?: number
	/** Another spell's context, for a tooltip value of it (`@spell.GnarQ:MiniTotalDamage@`). */
	spell?: (name: string) => FormulaContext | undefined
}

/** `spell.GnarQ:MiniTotalDamage`: another spell's calculation, at this ability's rank. */
const SPELL_REFERENCE = /^spell\.([^:]+):(.+)$/i

/** A formula as far as it could be read, and why the rest could not. */
type Read<Value> = { value?: Value; notModeled: string[] }

function notModeled<Value>(reason: string): Read<Value> {
	return { notModeled: [reason] }
}

function number(value: unknown, fallback = 0): number {
	return typeof value === "number" ? round(value) : fallback
}

/** A list collapses to one number when every entry is the same. */
function compact(values: readonly number[], key: "byRank" | "byLevel") {
	const [first] = values
	if (first !== undefined && values.every((value) => value === first)) {
		return first
	}
	return key === "byRank" ? { byRank: [...values] } : { byLevel: [...values] }
}

function namedValue(
	name: unknown,
	context: FormulaContext,
): Read<FormulaValue> {
	const list =
		typeof name === "string"
			? context.values.get(name.toLowerCase())
			: undefined
	if (!list) return notModeled(`a value the data lacks (${String(name)})`)
	const ranks =
		context.maxRank === undefined
			? list.slice(1)
			: list.slice(1, context.maxRank + 1)
	if (ranks.some((value) => value === null) || !ranks.length) {
		return notModeled(`a value the data lacks (${String(name)})`)
	}
	const value = compact((ranks as number[]).map(round), "byRank")
	if (context.maxRank === undefined && typeof value !== "number") {
		return notModeled(`a passive value that changes with a rank (${name})`)
	}
	return { value, notModeled: [] }
}

/** The game's level progression multiplier: 0 at level 1, 17 at level 18 (as champion stat growth). */
function growthMultiplier(level: number): number {
	const gained = level - 1
	return gained * (0.7025 + 0.0175 * gained)
}

function byLevel(read: (level: number) => number): FormulaValue {
	const levels = Array.from({ length: CHAMPION_LEVELS }, (_, index) =>
		round(read(index + 1)),
	)
	return compact(levels, "byLevel")
}

/** From `mStartValue` at level 1 to `mEndValue` at 18: linearly, or along the stat growth curve. */
function interpolation(part: Part): FormulaValue {
	const start = number(part.mStartValue)
	const end = number(part.mEndValue)
	const curve = part.mScaleByStatProgressionMultiplier === true
	return byLevel((level) => {
		const progress = curve
			? growthMultiplier(level) / growthMultiplier(CHAMPION_LEVELS)
			: (level - 1) / (CHAMPION_LEVELS - 1)
		return start + (end - start) * progress
	})
}

type Breakpoint = {
	mLevel?: number
	mAdditionalBonusAtThisLevel?: number
	mBonusPerLevelAtAndAfter?: number
}

/** `mLevel1Value`, plus `mInitialBonusPerLevel` each level, plus each breakpoint's jump and new per-level bonus from its level on. */
function breakpoints(part: Part): FormulaValue {
	const points = (part.mBreakpoints ?? []) as Breakpoint[]
	return byLevel((level) => {
		let value = number(part.mLevel1Value)
		let perLevel = number(part.mInitialBonusPerLevel)
		for (let reached = 2; reached <= level; reached++) {
			const point = points.find(({ mLevel }) => mLevel === reached)
			value += number(point?.mAdditionalBonusAtThisLevel)
			perLevel = number(point?.mBonusPerLevelAtAndAfter, perLevel)
			value += perLevel
		}
		return value
	})
}

/** A part that is one number: fixed, by rank, or by champion level. */
function valuePart(part: Part, context: FormulaContext): Read<FormulaValue> {
	switch (part.__type) {
		case "NumberCalculationPart":
			return { value: number(part.mNumber), notModeled: [] }
		case "NamedDataValueCalculationPart":
			return namedValue(part.mDataValue, context)
		case "ByCharLevelInterpolationCalculationPart":
			return { value: interpolation(part), notModeled: [] }
		case "ByCharLevelBreakpointsCalculationPart":
			return { value: breakpoints(part), notModeled: [] }
		default:
			return notModeled(
				UNREAD_PARTS[part.__type ?? ""] ?? `a game part (${part.__type})`,
			)
	}
}

function statPart(part: Part, ratio: Read<FormulaValue>): Read<FormulaPart> {
	const statId = number(part.mStat)
	const stat = GAME_STATS[statId]
	const formula = number(part.mStatFormula)
	if (!stat)
		return notModeled(`a stat the formulas don't read (game stat ${statId})`)
	if (!(formula in STAT_PARTS)) {
		return notModeled(`a stat part the formulas don't read (${formula})`)
	}
	if (ratio.value === undefined) return { notModeled: ratio.notModeled }
	const statPart = STAT_PARTS[formula]
	return {
		value: { stat, ...(statPart && { part: statPart }), ratio: ratio.value },
		notModeled: [],
	}
}

function formulaPart(part: Part, context: FormulaContext): Read<FormulaPart> {
	switch (part.__type) {
		case "StatByCoefficientCalculationPart":
			return statPart(part, {
				value: number(part.mCoefficient),
				notModeled: [],
			})
		case "StatByNamedDataValueCalculationPart":
			return statPart(part, namedValue(part.mDataValue, context))
		case "StatBySubPartCalculationPart":
			return statPart(part, valuePart((part.mSubpart ?? {}) as Part, context))
		default: {
			const read = valuePart(part, context)
			return read.value === undefined
				? { notModeled: read.notModeled }
				: { value: { value: read.value }, notModeled: [] }
		}
	}
}

function toList(value: FormulaValue): {
	key: "byRank" | "byLevel" | undefined
	list: number[] | number
} {
	if (typeof value === "number") return { key: undefined, list: value }
	return "byRank" in value
		? { key: "byRank", list: value.byRank }
		: { key: "byLevel", list: value.byLevel }
}

/** The product of two values, when it is one of the shapes (a rank list times a level list is not). */
function multiply(a: FormulaValue, b: FormulaValue): FormulaValue | undefined {
	const left = toList(a)
	const right = toList(b)
	if (left.key && right.key && left.key !== right.key) return undefined
	const key = left.key ?? right.key
	if (!key) return round((left.list as number) * (right.list as number))
	const length = Array.isArray(left.list)
		? left.list.length
		: (right.list as number[]).length
	const at = (list: number[] | number, index: number) =>
		Array.isArray(list) ? (list[index] ?? 0) : list
	const product = Array.from({ length }, (_, index) =>
		round(at(left.list, index) * at(right.list, index)),
	)
	return compact(product, key)
}

type Formula = Pick<AbilityDamage, "parts" | "multiplier">

/** A calculation by name, following `mModifiedGameCalculation` to the one it scales. */
function calculation(
	name: string,
	context: FormulaContext,
	seen: ReadonlySet<string> = new Set(),
): Read<Formula> {
	const [, spellName, calcName] = SPELL_REFERENCE.exec(name) ?? []
	if (spellName && calcName) {
		const other = context.spell?.(spellName)
		return other
			? calculation(calcName, other, seen)
			: notModeled(`another spell the data lacks (${spellName})`)
	}
	const key = Object.keys(context.calculations).find(
		(candidate) => candidate.toLowerCase() === name.toLowerCase(),
	)
	const calc = (key ? context.calculations[key] : undefined) as Part | undefined
	if (!calc || !key) return valueAsFormula(name, context)
	if (seen.has(key))
		return notModeled(`a calculation that reads itself (${key})`)

	switch (calc.__type) {
		case "GameCalculation":
			return gameCalculation(calc, context)
		case "GameCalculationModified": {
			if (calc.mOverrideSpellLevel !== undefined) {
				return notModeled("a calculation at another rank")
			}
			const base = calculation(
				String(calc.mModifiedGameCalculation),
				context,
				new Set([...seen, key]),
			)
			return scaled(base, valuePart((calc.mMultiplier ?? {}) as Part, context))
		}
		case "GameCalculationConditional":
			return notModeled("a calculation that depends on a buff")
		default:
			return notModeled(
				`a calculation the formulas don't read (${calc.__type})`,
			)
	}
}

/** A tooltip value that is not a calculation but a spell value ("@BaseDamage@"). */
function valueAsFormula(name: string, context: FormulaContext): Read<Formula> {
	const read = namedValue(name, context)
	return read.value === undefined
		? { notModeled: read.notModeled }
		: { value: { parts: [{ value: read.value }] }, notModeled: [] }
}

function scaled(
	base: Read<Formula>,
	multiplier: Read<FormulaValue>,
): Read<Formula> {
	const reasons = [...base.notModeled, ...multiplier.notModeled]
	if (!base.value || multiplier.value === undefined)
		return { notModeled: reasons }
	const product =
		base.value.multiplier === undefined
			? multiplier.value
			: multiply(base.value.multiplier, multiplier.value)
	if (product === undefined) {
		return notModeled("a multiplier by rank and by champion level")
	}
	return {
		value: {
			parts: base.value.parts,
			...(product !== 1 && { multiplier: product }),
		},
		notModeled: reasons,
	}
}

function gameCalculation(calc: Part, context: FormulaContext): Read<Formula> {
	if (calc.mDisplayAsPercent === true) {
		return notModeled("a percentage, such as a share of the target's health")
	}
	if (calc.ResultModifier !== undefined) {
		return notModeled("a modified result")
	}
	const parts: FormulaPart[] = []
	const reasons: string[] = []
	for (const raw of (calc.mFormulaParts ?? []) as Part[]) {
		const read = formulaPart(raw, context)
		if (read.value) parts.push(read.value)
		reasons.push(...read.notModeled)
	}
	const formula: Read<Formula> = { value: { parts }, notModeled: reasons }
	return calc.mMultiplier
		? scaled(formula, valuePart(calc.mMultiplier as Part, context))
		: formula
}

const DAMAGE_TAG = /<(physical|magic|true)Damage>(.*?)<\/\1Damage>/gis
const VALUE_TOKEN = /@([^@]+)@(%?)/g
/** Tooltip values for other targets than a champion. */
const NOT_CHAMPION = /minion|monster|turret|structure/i

const TAG_TYPES: Readonly<Record<string, DamageType>> = {
	physical: "physical",
	magic: "magic",
	true: "true",
}

/** The tooltip's damage texts in order: each value inside a `<physicalDamage>`-like tag, by name. */
export function tooltipDamages(
	markup: string | undefined,
): { name: string; type: DamageType; percent: boolean }[] {
	const found: { name: string; type: DamageType; percent: boolean }[] = []
	for (const [, tag = "", text = ""] of (markup ?? "").matchAll(DAMAGE_TAG)) {
		const type = TAG_TYPES[tag.toLowerCase()]
		if (!type) continue
		for (const [, token = "", percentSign] of text.matchAll(VALUE_TOKEN)) {
			const [name = "", scale] = token.split("*")
			if (NOT_CHAMPION.test(name)) continue
			if (
				found.some((damage) => damage.name.toLowerCase() === name.toLowerCase())
			) {
				continue
			}
			found.push({ name, type, percent: !!scale || !!percentSign })
		}
	}
	return found
}

/** The damage a tooltip shows, each as its formula or with what the sync could not read. Pure. */
export function abilityDamage(
	markup: string | undefined,
	context: FormulaContext,
): AbilityDamage[] {
	return tooltipDamages(markup).map(({ name, type, percent }) => {
		const read = percent
			? notModeled<Formula>(
					"a percentage, such as a share of the target's health",
				)
			: calculation(name, context)
		const reasons = [...new Set(read.notModeled)]
		return {
			name,
			type,
			parts: read.value?.parts ?? [],
			...(read.value?.multiplier !== undefined && {
				multiplier: read.value.multiplier,
			}),
			...(reasons.length && { notModeled: reasons }),
		}
	})
}

/**
 * Seconds the cast takes: `mCastTime`, the game's own, else `spellCastTime`; undefined when neither
 * is set. A negative one (Fiora's Q: -0.375) is the game's "no cast time" mark.
 */
export function castTime(spell: SpellObject): number | undefined {
	const { mCastTime, spellCastTime } = spell.mSpell ?? {}
	const seconds = [mCastTime, spellCastTime].find(
		(value) => value !== undefined && value >= 0,
	)
	return seconds === undefined ? undefined : round(seconds)
}

/** The tooltip's main text, values as `@Name@`: the game's generated one, else the spell's own text. */
export function tooltipMarkup(
	spell: SpellObject,
	strings: GameStrings,
): string | undefined {
	const tooltip = spell.mSpell?.mClientData?.mTooltipData
	const objectName = tooltip?.mObjectName?.toLowerCase()
	const key = tooltip?.mLocKeys?.keyTooltip?.toLowerCase()
	return (
		(objectName &&
			strings(`generatedtip_spell_${objectName}_tooltipcontent`)) ||
		(key ? strings(key) : undefined)
	)
}

export type SpellCombatOptions = {
	strings: GameStrings
	/** Absent for a passive. */
	maxRank?: number
	/** The champion's spell objects by name ("GnarQ"), which a tooltip may read values of. */
	findSpell: (name: string) => SpellObject | undefined
	spellValues: (spell: SpellObject) => SpellValues
}

function formulaContext(
	spell: SpellObject,
	options: Omit<SpellCombatOptions, "strings">,
): FormulaContext {
	const { maxRank, findSpell } = options
	return {
		values: options.spellValues(spell),
		calculations: spell.mSpell?.mSpellCalculations ?? {},
		...(maxRank !== undefined && { maxRank }),
		spell: (name) => {
			const other = findSpell(name)
			return other && formulaContext(other, options)
		},
	}
}

/** The cast time and damage formulas of a spell, as fields of its synced ability (left out when absent). */
export function spellCombatFields(
	spell: SpellObject,
	{ strings, ...options }: SpellCombatOptions,
): { castTime?: number; damage?: AbilityDamage[] } {
	const seconds = castTime(spell)
	const { maxRank } = options
	const damage = abilityDamage(
		tooltipMarkup(spell, strings),
		formulaContext(spell, options),
	)
	return {
		...(seconds !== undefined &&
			maxRank !== undefined && { castTime: seconds }),
		...(damage.length && { damage }),
	}
}
