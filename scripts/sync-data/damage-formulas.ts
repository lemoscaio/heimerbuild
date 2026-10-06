import type { SpellObject, SpellValues } from "./normalize-abilities"
import {
	type AbilityDamage,
	CHAMPION_LEVELS,
	type DamageType,
	type FormulaPart,
	type FormulaStat,
	type FormulaValue,
	type TargetHealth,
} from "./schemas/champion"

/**
 * The game's stat ids in calculation parts (`mStat`, absent is 0), checked against the wiki's
 * ratios: Ezreal's Q reads 2 (130% AD), Rammus's W 1 and 6, Braum's Q 12 (maximum health),
 * Janna's passive 7 (bonus movement speed), Twisted Fate's W 8, Pyke's R 29 (lethality).
 */
const GAME_STATS: Readonly<Record<number, FormulaStat>> = {
	0: "abilityPower",
	1: "armor",
	2: "attackDamage",
	6: "magicResist",
	7: "movementSpeed",
	8: "critChance",
	12: "health",
	29: "lethality",
}

/** `mStatFormula`: absent or 0 reads the total, 1 the base part, 2 the bonus part. */
const STAT_PARTS: Readonly<Record<number, "base" | "bonus" | undefined>> = {
	0: undefined,
	1: "base",
	2: "bonus",
}

/** Part types the formulas don't read yet, by what the coverage report calls them. */
const UNREAD_PARTS: Readonly<Record<string, string>> = {
	ClampSubPartsCalculationPart: "clamped sub-parts",
	BuffCounterByNamedDataValueCalculationPart: "a buff counter",
	BuffCounterByCoefficientCalculationPart: "a buff counter",
	EffectValueCalculationPart: "an effect value",
	AbilityResourceByCoefficientCalculationPart: "the ability resource",
	CooldownMultiplierCalculationPart: "the cooldown",
	PercentageOfBuffNameElapsed: "a buff's elapsed time",
}

type Part = Record<string, unknown> & { __type?: string }

/** The game's text by lowercase key, from CommunityDragon's `lol.stringtable.json`. */
export type GameStrings = (key: string) => string | undefined

function round(value: number): number {
	// CommunityDragon stores float32 values (1.2999999523162842); 6 significant digits drop the
	// noise and keep a small ratio whole (2.5% per 100 bonus AD is 0.00025).
	return Number(value.toPrecision(6))
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

/** `values[level]` for levels 1 to 18 (index 0 is level 0, the rest past 18 is unused). */
function levelTable(part: Part): Read<FormulaValue> {
	const list = (part.values ?? []) as unknown[]
	const levels = list.slice(1, CHAMPION_LEVELS + 1)
	if (levels.length !== CHAMPION_LEVELS) {
		return notModeled("a per-level table the data lacks levels of")
	}
	return {
		value: byLevel((level) => number(levels[level - 1])),
		notModeled: [],
	}
}

/** A part that is one number: fixed, by rank, or by champion level. */
function numberPart(part: Part, context: FormulaContext): Read<FormulaValue> {
	switch (part.__type) {
		case "NumberCalculationPart":
			return { value: number(part.mNumber), notModeled: [] }
		case "NamedDataValueCalculationPart":
			return namedValue(part.mDataValue, context)
		case "ByCharLevelInterpolationCalculationPart":
			return { value: interpolation(part), notModeled: [] }
		case "ByCharLevelBreakpointsCalculationPart":
			return { value: breakpoints(part), notModeled: [] }
		case "ByCharLevelFormulaCalculationPart":
			return levelTable(part)
		default:
			return notModeled(
				UNREAD_PARTS[part.__type ?? ""] ?? `a game part (${part.__type})`,
			)
	}
}

/** A part read as one number: its addends must all be numbers (no stat inside a ratio). */
function valuePart(part: Part, context: FormulaContext): Read<FormulaValue> {
	const read = formulaParts(part, context)
	if (!read.value || read.notModeled.length)
		return { notModeled: read.notModeled }
	const value = constant(read.value)
	return value === undefined
		? notModeled("a stat inside a ratio")
		: { value, notModeled: [] }
}

function statPart(part: Part, ratio: Read<FormulaValue>): Read<FormulaPart[]> {
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
		value: [{ stat, ...(statPart && { part: statPart }), ratio: ratio.value }],
		notModeled: [],
	}
}

/** The addends a part stands for: a summed part adds its sub-parts, a multiplied one scales them. */
function formulaParts(
	part: Part,
	context: FormulaContext,
): Read<FormulaPart[]> {
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
		case "SumOfSubPartsCalculationPart":
			return sum(
				((part.mSubparts ?? []) as Part[]).map((sub) =>
					formulaParts(sub, context),
				),
			)
		case "ProductOfSubPartsCalculationPart":
			return product(
				formulaParts((part.mPart1 ?? {}) as Part, context),
				formulaParts((part.mPart2 ?? {}) as Part, context),
			)
		default: {
			const read = numberPart(part, context)
			return read.value === undefined
				? { notModeled: read.notModeled }
				: { value: [{ value: read.value }], notModeled: [] }
		}
	}
}

/** Addends read side by side; the ones that could not be read leave their reasons. */
function sum(reads: readonly Read<FormulaPart[]>[]): Read<FormulaPart[]> {
	return {
		value: reads.flatMap((read) => read.value ?? []),
		notModeled: reads.flatMap((read) => read.notModeled),
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

/** Two values combined entry by entry, when it is one of the shapes (a rank list with a level list is not). */
function combine(
	a: FormulaValue,
	b: FormulaValue,
	operation: (left: number, right: number) => number,
): FormulaValue | undefined {
	const left = toList(a)
	const right = toList(b)
	if (left.key && right.key && left.key !== right.key) return undefined
	const key = left.key ?? right.key
	if (!key) return round(operation(left.list as number, right.list as number))
	const length = Array.isArray(left.list)
		? left.list.length
		: (right.list as number[]).length
	const at = (list: number[] | number, index: number) =>
		Array.isArray(list) ? (list[index] ?? 0) : list
	const result = Array.from({ length }, (_, index) =>
		round(operation(at(left.list, index), at(right.list, index))),
	)
	return compact(result, key)
}

function multiply(a: FormulaValue, b: FormulaValue): FormulaValue | undefined {
	return combine(a, b, (left, right) => left * right)
}

/** The parts' sum when every one is a number; undefined when one reads a stat. */
function constant(parts: readonly FormulaPart[]): FormulaValue | undefined {
	let total: FormulaValue | undefined = 0
	for (const part of parts) {
		if (!("value" in part) || total === undefined) return undefined
		total = combine(total, part.value, (left, right) => left + right)
	}
	return total
}

/** Every part times `factor`: a flat value, or a stat's ratio. */
function scaleParts(
	parts: readonly FormulaPart[],
	factor: FormulaValue,
): FormulaPart[] | undefined {
	const scaled: FormulaPart[] = []
	for (const part of parts) {
		const value = multiply("value" in part ? part.value : part.ratio, factor)
		if (value === undefined) return undefined
		scaled.push("value" in part ? { value } : { ...part, ratio: value })
	}
	return scaled
}

/** A product of two sums, when one of them is a number (a stat times a stat is not a formula). */
function product(
	a: Read<FormulaPart[]>,
	b: Read<FormulaPart[]>,
): Read<FormulaPart[]> {
	const reasons = [...a.notModeled, ...b.notModeled]
	if (!a.value || !b.value || reasons.length) return { notModeled: reasons }
	const left = constant(a.value)
	const right = constant(b.value)
	if (left === undefined && right === undefined) {
		return notModeled("a stat multiplied by a stat")
	}
	const parts =
		left === undefined
			? scaleParts(a.value, right as FormulaValue)
			: scaleParts(b.value, left)
	return parts
		? { value: parts, notModeled: [] }
		: notModeled("a multiplier by rank and by champion level")
}

/** `percent`: the game shows the result as a percentage (`mDisplayAsPercent`). */
type Formula = Pick<AbilityDamage, "parts" | "multiplier"> & { percent?: true }

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
			const result = scaled(
				base,
				formulaParts((calc.mMultiplier ?? {}) as Part, context),
			)
			return calc.mDisplayAsPercent === true && result.value
				? { ...result, value: { ...result.value, percent: true } }
				: result
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

/**
 * A formula times a multiplier. A multiplier that reads a stat (Lucian's R: shots × the damage of
 * one) needs a formula that is a number, and its parts take the product.
 */
function scaled(
	base: Read<Formula>,
	multiplier: Read<FormulaPart[]>,
): Read<Formula> {
	const reasons = [...base.notModeled, ...multiplier.notModeled]
	if (!base.value || !multiplier.value) return { notModeled: reasons }
	const { parts, multiplier: own, percent } = base.value
	const factor = constant(multiplier.value)
	if (factor === undefined) {
		const count = constant(parts)
		const times =
			count === undefined || own === undefined ? count : multiply(count, own)
		const scaledParts =
			times === undefined ? undefined : scaleParts(multiplier.value, times)
		if (!scaledParts) return notModeled("a stat multiplied by a stat")
		return {
			value: { parts: scaledParts, ...(percent && { percent }) },
			notModeled: reasons,
		}
	}
	const product = own === undefined ? factor : multiply(own, factor)
	if (product === undefined) {
		return notModeled("a multiplier by rank and by champion level")
	}
	return {
		value: {
			parts,
			...(product !== 1 && { multiplier: product }),
			...(percent && { percent }),
		},
		notModeled: reasons,
	}
}

function gameCalculation(calc: Part, context: FormulaContext): Read<Formula> {
	if (calc.ResultModifier !== undefined) {
		return notModeled("a modified result")
	}
	const read = sum(
		((calc.mFormulaParts ?? []) as Part[]).map((raw) =>
			formulaParts(raw, context),
		),
	)
	const formula: Read<Formula> = {
		value: {
			parts: read.value ?? [],
			...(calc.mDisplayAsPercent === true && { percent: true }),
		},
		notModeled: read.notModeled,
	}
	return calc.mMultiplier
		? scaled(formula, formulaParts(calc.mMultiplier as Part, context))
		: formula
}

const DAMAGE_TAG = /<(physical|magic|true)Damage>(.*?)<\/\1Damage>/gis
const VALUE_TOKEN = /@([^@]+)@(%?)/g
/** Tooltip values for other targets than a champion. */
const NOT_CHAMPION = /minion|monster|turret|structure/i
/** The text after a percentage that names the target's health: "% max Health", "of their maximum Health". */
const HEALTH_TEXT =
	/^\s*(?:of (?:the target's|their)\s+)?(max(?:imum)?|current|missing)[\s-]+health/i

const TAG_TYPES: Readonly<Record<string, DamageType>> = {
	physical: "physical",
	magic: "magic",
	true: "true",
}

function targetHealth(text: string): TargetHealth | undefined {
	const word = HEALTH_TEXT.exec(text)?.[1]?.toLowerCase()
	if (!word) return undefined
	return word.startsWith("max") ? "maximum" : (word as TargetHealth)
}

/** One damage value of a tooltip: `@Name*scale@%`, and the target's health the text after it names. */
export type TooltipDamage = {
	name: string
	type: DamageType
	/** The tooltip multiplies the value (`@PercentHealth*100@`). */
	scale?: number
	/** The tooltip shows it with a percent sign. */
	percent: boolean
	ofTargetHealth?: TargetHealth
}

/** The tooltip's damage texts in order: each value inside a `<physicalDamage>`-like tag, by name. */
export function tooltipDamages(markup: string | undefined): TooltipDamage[] {
	const found: TooltipDamage[] = []
	for (const [, tag = "", text = ""] of (markup ?? "").matchAll(DAMAGE_TAG)) {
		const type = TAG_TYPES[tag.toLowerCase()]
		if (!type) continue
		for (const token of text.matchAll(VALUE_TOKEN)) {
			const [match, value = "", percentSign] = token
			const [name = "", scale] = value.split("*")
			if (NOT_CHAMPION.test(name)) continue
			if (
				found.some((damage) => damage.name.toLowerCase() === name.toLowerCase())
			) {
				continue
			}
			const health = targetHealth(text.slice(token.index + match.length))
			found.push({
				name,
				type,
				...(scale !== undefined && { scale: Number(scale) }),
				percent: !!percentSign,
				...(health && { ofTargetHealth: health }),
			})
		}
	}
	return found
}

/**
 * A tooltip value as a formula. A percentage of the target's health becomes a fraction of it: the
 * game's own percent display is one already, a value followed by "%" is in hundredths.
 */
function tooltipFormula(
	damage: TooltipDamage,
	context: FormulaContext,
): Read<Formula> & { ofTargetHealth?: TargetHealth } {
	const read = calculation(damage.name, context)
	const displayed = read.value?.percent === true
	if (!displayed && !damage.percent) {
		return damage.scale === undefined
			? read
			: notModeled(`a tooltip value scaled by ${damage.scale}`)
	}
	if (!damage.ofTargetHealth) {
		return notModeled(
			"a percentage of something other than the target's health",
		)
	}
	const factor = (displayed ? 1 : 0.01) * (damage.scale ?? 1)
	return {
		...scaled(read, { value: [{ value: factor }], notModeled: [] }),
		ofTargetHealth: damage.ofTargetHealth,
	}
}

/** The damage a tooltip shows, each as its formula or with what the sync could not read. Pure. */
export function abilityDamage(
	markup: string | undefined,
	context: FormulaContext,
): AbilityDamage[] {
	return tooltipDamages(markup).map((damage) => {
		const read = tooltipFormula(damage, context)
		const reasons = [...new Set(read.notModeled)]
		return {
			name: damage.name,
			type: damage.type,
			parts: read.value?.parts ?? [],
			...(read.value?.multiplier !== undefined && {
				multiplier: read.value.multiplier,
			}),
			...(read.value &&
				read.ofTargetHealth && {
					ofTargetHealth: read.ofTargetHealth,
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
