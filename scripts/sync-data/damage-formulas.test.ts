import { describe, expect, test } from "bun:test"
import {
	type Champion,
	championSchema,
	type FormulaValue,
} from "@schemas/champion"
import {
	abilityDamage,
	castTime,
	type FormulaContext,
	tooltipDamages,
} from "./damage-formulas"
import type { SpellValues } from "./normalize-abilities"

/** Spell values as the game files list them: index = rank, index 0 is rank 0. */
function values(entries: Record<string, number[]>): SpellValues {
	return new Map(
		Object.entries(entries).map(([name, list]) => [name.toLowerCase(), list]),
	)
}

const EZREAL_Q: FormulaContext = {
	maxRank: 5,
	values: values({
		BaseDamage: [-5, 20, 45, 70, 95, 120, 145],
		BaseDamageADRatio: [1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3],
		BaseDamageAPRatio: [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
	}),
	calculations: {
		Damage: {
			__type: "GameCalculation",
			mFormulaParts: [
				{ __type: "NamedDataValueCalculationPart", mDataValue: "BaseDamage" },
				{
					__type: "StatByNamedDataValueCalculationPart",
					mStat: 2,
					mDataValue: "BaseDamageADRatio",
				},
				{
					__type: "StatByNamedDataValueCalculationPart",
					mDataValue: "BaseDamageAPRatio",
				},
			],
		},
	},
}

function physical(name: string) {
	return `deals <physicalDamage>@${name}@ physical damage</physicalDamage>`
}

function byLevelAt(value: FormulaValue | undefined, level: number) {
	if (typeof value !== "object" || !("byLevel" in value)) {
		throw new Error("not a value by level")
	}
	return value.byLevel[level - 1]
}

describe("abilityDamage", () => {
	test("reads the base by rank and the stat ratios (Ezreal's Q: 20 to 120, +130% AD, +40% AP)", () => {
		expect(abilityDamage(physical("Damage"), EZREAL_Q)).toEqual([
			{
				name: "Damage",
				type: "physical",
				parts: [
					{ value: { byRank: [20, 45, 70, 95, 120] } },
					{ stat: "attackDamage", ratio: 1.3 },
					{ stat: "abilityPower", ratio: 0.4 },
				],
			},
		])
	})

	test("reads the bonus part of a stat and a ratio that changes by rank", () => {
		const [damage] = abilityDamage(physical("TotalDamage"), {
			maxRank: 5,
			values: values({ ADRatio: [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05] }),
			calculations: {
				TotalDamage: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "StatByNamedDataValueCalculationPart",
							mStat: 2,
							mStatFormula: 2,
							mDataValue: "ADRatio",
						},
						{
							__type: "StatByCoefficientCalculationPart",
							mStat: 1,
							mCoefficient: 0.4,
						},
					],
				},
			},
		})

		expect(damage?.parts).toEqual([
			{
				stat: "attackDamage",
				part: "bonus",
				ratio: { byRank: [0.8, 0.85, 0.9, 0.95, 1] },
			},
			{ stat: "armor", ratio: 0.4 },
		])
	})

	test("interpolates a value by champion level from level 1 to 18 (Quinn's Harrier: 15 to 120)", () => {
		const [damage] = abilityDamage(physical("BonusDamage"), {
			values: values({}),
			calculations: {
				BonusDamage: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "ByCharLevelInterpolationCalculationPart",
							mStartValue: 15,
							mEndValue: 120,
						},
					],
				},
			},
		})
		const [part] = damage?.parts ?? []
		const value = part && "value" in part ? part.value : undefined

		expect(byLevelAt(value, 1)).toBe(15)
		expect(byLevelAt(value, 9)).toBeCloseTo(15 + (105 * 8) / 17, 3)
		expect(byLevelAt(value, 18)).toBe(120)
	})

	test("steps a value by champion level through its breakpoints (Ziggs's Short Fuse: 20, 40 at 6, 48 at 7, 100 at 13, 160 at 18)", () => {
		const [damage] = abilityDamage(physical("TotalDamage"), {
			values: values({}),
			calculations: {
				TotalDamage: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "ByCharLevelBreakpointsCalculationPart",
							mLevel1Value: 20,
							mInitialBonusPerLevel: 4,
							mBreakpoints: [
								{ mLevel: 7, mBonusPerLevelAtAndAfter: 8 },
								{ mLevel: 13, mBonusPerLevelAtAndAfter: 12 },
							],
						},
					],
				},
			},
		})
		const [part] = damage?.parts ?? []
		const value = part && "value" in part ? part.value : undefined

		expect(
			[1, 6, 7, 12, 13, 18].map((level) => byLevelAt(value, level)),
		).toEqual([20, 40, 48, 88, 100, 160])
	})

	test("follows a modified calculation to the one it scales (Ahri's W: later flames deal 40%)", () => {
		const [, multiFire] = abilityDamage(
			`<magicDamage>@SingleFireDamage@</magicDamage> then <magicDamage>@MultiFireDamage@</magicDamage>`,
			{
				maxRank: 5,
				values: values({
					BaseDamage: [0, 40, 60, 80, 100, 120, 140],
					RepeatDamageMod: [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
				}),
				calculations: {
					SingleFireDamage: {
						__type: "GameCalculation",
						mFormulaParts: [
							{
								__type: "NamedDataValueCalculationPart",
								mDataValue: "BaseDamage",
							},
						],
					},
					MultiFireDamage: {
						__type: "GameCalculationModified",
						mModifiedGameCalculation: "SingleFireDamage",
						mMultiplier: {
							__type: "NamedDataValueCalculationPart",
							mDataValue: "RepeatDamageMod",
						},
					},
				},
			},
		)

		expect(multiFire).toEqual({
			name: "MultiFireDamage",
			type: "magic",
			parts: [{ value: { byRank: [40, 60, 80, 100, 120] } }],
			multiplier: 0.4,
		})
	})

	test("reads another spell's calculation the tooltip names (`spell.GnarQ:MiniTotalDamage`)", () => {
		const gnarQ: FormulaContext = {
			maxRank: 5,
			values: values({ BaseDamage: [0, 5, 45, 85, 125, 165, 205] }),
			calculations: {
				MiniTotalDamage: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "NamedDataValueCalculationPart",
							mDataValue: "BaseDamage",
						},
					],
				},
			},
		}
		const [damage] = abilityDamage(physical("spell.GnarQ:MiniTotalDamage"), {
			maxRank: 5,
			values: values({}),
			calculations: {},
			spell: (name) => (name === "GnarQ" ? gnarQ : undefined),
		})

		expect(damage?.parts).toEqual([
			{ value: { byRank: [5, 45, 85, 125, 165] } },
		])
		expect(damage?.notModeled).toBeUndefined()
	})

	test("marks what it can't read as not modeled, with why, and keeps no number for it", () => {
		const damages = abilityDamage(
			[
				`<magicDamage>@PercentDamage@ increased damage</magicDamage>`,
				`<magicDamage>@Stacked@</magicDamage>`,
				`<magicDamage>@SpeedScaled@</magicDamage>`,
				`<magicDamage>@StatTimesStat@</magicDamage>`,
				`<magicDamage>@Missing@</magicDamage>`,
			].join(" "),
			{
				maxRank: 5,
				values: values({}),
				calculations: {
					PercentDamage: {
						__type: "GameCalculation",
						mDisplayAsPercent: true,
						mFormulaParts: [],
					},
					Stacked: {
						__type: "GameCalculation",
						mFormulaParts: [
							{ __type: "NumberCalculationPart", mNumber: 50 },
							{ __type: "BuffCounterByCoefficientCalculationPart" },
						],
					},
					SpeedScaled: {
						__type: "GameCalculation",
						mFormulaParts: [
							{
								__type: "StatByCoefficientCalculationPart",
								mStat: 4,
								mCoefficient: 0.5,
							},
						],
					},
					StatTimesStat: {
						__type: "GameCalculation",
						mFormulaParts: [
							{
								__type: "ProductOfSubPartsCalculationPart",
								mPart1: { __type: "StatByCoefficientCalculationPart" },
								mPart2: {
									__type: "StatByCoefficientCalculationPart",
									mStat: 2,
								},
							},
						],
					},
				},
			},
		)

		expect(damages.map(({ name, notModeled }) => [name, notModeled])).toEqual([
			[
				"PercentDamage",
				["a percentage of something other than the target's health"],
			],
			["Stacked", ["a buff counter"]],
			["SpeedScaled", ["a stat the formulas don't read (game stat 4)"]],
			["StatTimesStat", ["a stat multiplied by a stat"]],
			["Missing", ["a value the data lacks (Missing)"]],
		])
	})

	test("reads a share of the target's maximum health shown by the game as a percent, with the AP that scales it (Shen's Q: 2% + 1.5% per 100 AP)", () => {
		const [damage] = abilityDamage(
			"<magicDamage>@BasePercentHealth@ max Health magic damage</magicDamage>",
			{
				maxRank: 5,
				values: values({ BasePercentDamage: [1.5, 2, 2.5, 3, 3.5, 4, 4.5] }),
				calculations: {
					BasePercentHealth: {
						__type: "GameCalculation",
						mDisplayAsPercent: true,
						mFormulaParts: [
							{
								__type: "NamedDataValueCalculationPart",
								mDataValue: "BasePercentDamage",
							},
							{
								__type: "StatByCoefficientCalculationPart",
								mCoefficient: 0.015,
							},
						],
						mMultiplier: { __type: "NumberCalculationPart", mNumber: 0.01 },
					},
				},
			},
		)

		expect(damage).toEqual({
			name: "BasePercentHealth",
			type: "magic",
			parts: [
				{ value: { byRank: [2, 2.5, 3, 3.5, 4] } },
				{ stat: "abilityPower", ratio: 0.015 },
			],
			multiplier: 0.01,
			ofTargetHealth: "maximum",
		})
	})

	test("reads a percentage the tooltip scales (`*100`) or shows in hundredths (`@X@%`) as a fraction of the target's health", () => {
		const context: FormulaContext = {
			maxRank: 3,
			values: values({
				ExecutePercent: [0, 0.25, 0.3, 0.35],
				CurrentPercent: [0, 4, 6, 8],
			}),
			calculations: {},
		}
		const [missing, current] = abilityDamage(
			[
				"<trueDamage>@ExecutePercent*100@% missing Health true damage</trueDamage>",
				"<magicDamage>@CurrentPercent@% current Health magic damage</magicDamage>",
			].join(" "),
			context,
		)

		expect(missing).toEqual({
			name: "ExecutePercent",
			type: "true",
			parts: [{ value: { byRank: [0.25, 0.3, 0.35] } }],
			ofTargetHealth: "missing",
		})
		expect(current).toEqual({
			name: "CurrentPercent",
			type: "magic",
			parts: [{ value: { byRank: [4, 6, 8] } }],
			multiplier: 0.01,
			ofTargetHealth: "current",
		})
	})

	test("adds summed sub-parts and scales multiplied ones (Twitch's E: 6 stacks of 10 + 35% bonus AD)", () => {
		const [damage] = abilityDamage(physical("MaxDamage"), {
			maxRank: 2,
			values: values({
				PerStack: [0, 10, 15],
				RatioPerStack: [0.35, 0.35, 0.35],
				MaxStacks: [6, 6, 6],
			}),
			calculations: {
				MaxDamage: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "SumOfSubPartsCalculationPart",
							mSubparts: [
								{ __type: "NumberCalculationPart", mNumber: 20 },
								{
									__type: "ProductOfSubPartsCalculationPart",
									mPart1: {
										__type: "NamedDataValueCalculationPart",
										mDataValue: "MaxStacks",
									},
									mPart2: {
										__type: "SumOfSubPartsCalculationPart",
										mSubparts: [
											{
												__type: "NamedDataValueCalculationPart",
												mDataValue: "PerStack",
											},
											{
												__type: "StatByNamedDataValueCalculationPart",
												mStat: 2,
												mStatFormula: 2,
												mDataValue: "RatioPerStack",
											},
										],
									},
								},
							],
						},
					],
				},
			},
		})

		expect(damage?.parts).toEqual([
			{ value: 20 },
			{ value: { byRank: [60, 90] } },
			{ stat: "attackDamage", part: "bonus", ratio: 2.1 },
		])
		expect(damage?.notModeled).toBeUndefined()
	})

	test("scales a stat-dependent multiplier by a calculation that is a number (Lucian's R: shots × damage per shot)", () => {
		const [damage] = abilityDamage(physical("TotalDamage"), {
			maxRank: 3,
			values: values({
				NumShots: [22, 22, 22, 22],
				BaseDamage: [0, 15, 30, 45],
			}),
			calculations: {
				Shots: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "NamedDataValueCalculationPart",
							mDataValue: "NumShots",
						},
					],
				},
				TotalDamage: {
					__type: "GameCalculationModified",
					mModifiedGameCalculation: "Shots",
					mMultiplier: {
						__type: "SumOfSubPartsCalculationPart",
						mSubparts: [
							{
								__type: "NamedDataValueCalculationPart",
								mDataValue: "BaseDamage",
							},
							{
								__type: "StatByCoefficientCalculationPart",
								mStat: 2,
								mCoefficient: 0.25,
							},
						],
					},
				},
			},
		})

		expect(damage?.parts).toEqual([
			{ value: { byRank: [330, 660, 990] } },
			{ stat: "attackDamage", ratio: 5.5 },
		])
	})

	test("reads a per-level table at levels 1 to 18 (Sett's Right Punch: 5 to 90)", () => {
		const [damage] = abilityDamage(physical("RightPunchBonus"), {
			values: values({}),
			calculations: {
				RightPunchBonus: {
					__type: "GameCalculation",
					mFormulaParts: [
						{
							__type: "ByCharLevelFormulaCalculationPart",
							values: Array.from({ length: 31 }, (_, level) => level * 5),
						},
					],
				},
			},
		})
		const [part] = damage?.parts ?? []
		const value = part && "value" in part ? part.value : undefined

		expect([1, 2, 18].map((level) => byLevelAt(value, level))).toEqual([
			5, 10, 90,
		])
	})

	test("reads bonus movement speed, critical strike chance and lethality ratios", () => {
		const [damage] = abilityDamage(physical("Damage"), {
			values: values({}),
			calculations: {
				Damage: {
					__type: "GameCalculation",
					mFormulaParts: [7, 8, 29].map((mStat) => ({
						__type: "StatByCoefficientCalculationPart",
						mStat,
						...(mStat === 7 && { mStatFormula: 2 }),
						mCoefficient: 0.3,
					})),
				},
			},
		})

		expect(damage?.parts).toEqual([
			{ stat: "movementSpeed", part: "bonus", ratio: 0.3 },
			{ stat: "critChance", ratio: 0.3 },
			{ stat: "lethality", ratio: 0.3 },
		])
	})

	test("refuses a passive value that changes by rank, since a passive has none", () => {
		const [damage] = abilityDamage(physical("Damage"), {
			values: values({ Damage: [10, 20, 30, 40, 50, 60, 70] }),
			calculations: {},
		})

		expect(damage?.notModeled).toEqual([
			"a passive value that changes with a rank (Damage)",
		])
	})
})

describe("tooltipDamages", () => {
	test("lists each damage value of the tooltip once, in order, with its type", () => {
		const markup = [
			"<magicDamage>@Damage@ magic damage</magicDamage>",
			"<trueDamage>@Execute@ true damage</trueDamage>",
			"<magicDamage>@Damage@ again</magicDamage>",
		].join(" ")

		expect(tooltipDamages(markup)).toEqual([
			{ name: "Damage", type: "magic", percent: false },
			{ name: "Execute", type: "true", percent: false },
		])
	})

	test("leaves out damage to minions and monsters, and reads a percentage's scale and the health it names", () => {
		const markup = [
			"<magicDamage>@DamageMinionMonster@</magicDamage>",
			"<magicDamage>@PercentHealth*100@% max Health</magicDamage>",
			"<trueDamage>@Execute@% missing-Health true damage</trueDamage>",
			"<magicDamage>@Current@ of their current Health</magicDamage>",
			"<magicDamage>@Amp*100@% increased damage</magicDamage>",
		].join(" ")

		expect(tooltipDamages(markup)).toEqual([
			{
				name: "PercentHealth",
				type: "magic",
				scale: 100,
				percent: true,
				ofTargetHealth: "maximum",
			},
			{
				name: "Execute",
				type: "true",
				percent: true,
				ofTargetHealth: "missing",
			},
			{
				name: "Current",
				type: "magic",
				percent: false,
				ofTargetHealth: "current",
			},
			{ name: "Amp", type: "magic", scale: 100, percent: true },
		])
	})
})

describe("castTime", () => {
	test("prefers the game's own cast time, else the animation's", () => {
		expect(castTime({ mSpell: { mCastTime: 0.6, spellCastTime: 0.25 } })).toBe(
			0.6,
		)
		expect(castTime({ mSpell: { spellCastTime: 0.25 } })).toBe(0.25)
		expect(castTime({ mSpell: {} })).toBeUndefined()
	})

	test("skips a negative cast time, the game's mark for none", () => {
		expect(castTime({ mSpell: { spellCastTime: -0.375 } })).toBeUndefined()
	})
})

/** A champion as the current patch's data serves it (public/data). */
async function currentChampion(key: string): Promise<Champion> {
	const { currentPatch } = await Bun.file(
		new URL("../../public/data/manifest.json", import.meta.url),
	).json()
	return championSchema.parse(
		await Bun.file(
			new URL(
				`../../public/data/${currentPatch}/champions/${key}.json`,
				import.meta.url,
			),
		).json(),
	)
}

// Checked against the wiki's ability data (Template:Data_<Champion>/<Ability>) on patch 16.19.
describe("synced damage formulas", () => {
	test("Ezreal: Mystic Shot 20 to 120 (+130% AD) (+40% AP), Essence Flux 80 to 300 (+100% bonus AD) (+90% AP)", async () => {
		const [q, w] = (await currentChampion("Ezreal")).abilities.spells

		expect(q?.castTime).toBe(0.25)
		expect(q?.damage?.[0]).toEqual({
			name: "Damage",
			type: "physical",
			parts: [
				{ value: { byRank: [20, 45, 70, 95, 120] } },
				{ stat: "attackDamage", ratio: 1.3 },
				{ stat: "abilityPower", ratio: 0.4 },
			],
		})
		expect(w?.damage?.[0]?.parts).toEqual([
			{ value: { byRank: [80, 135, 190, 245, 300] } },
			{ stat: "attackDamage", part: "bonus", ratio: 1 },
			{ stat: "abilityPower", ratio: 0.9 },
		])
	})

	test("Quinn: Harrier 15 to 120 by level (+40% bonus AD), Vault 40 to 140 (+20% bonus AD) with no cast time", async () => {
		const { passive, spells } = (await currentChampion("Quinn")).abilities
		const [harrier] = passive.damage ?? []
		const [level] = harrier?.parts ?? []

		expect(harrier?.type).toBe("physical")
		expect(level && "value" in level && byLevelAt(level.value, 18)).toBe(120)
		expect(harrier?.parts[1]).toEqual({
			stat: "attackDamage",
			part: "bonus",
			ratio: 0.4,
		})
		expect(spells[2]?.castTime).toBe(0)
		expect(spells[2]?.damage?.[0]?.parts).toEqual([
			{ value: { byRank: [40, 65, 90, 115, 140] } },
			{ stat: "attackDamage", part: "bonus", ratio: 0.2 },
		])
	})

	test("Vayne: Silver Bolts 4% to 10% of the target's maximum health; Camille: Tactical Sweep's outer cone 7% to 9% (+2.5% per 100 bonus AD)", async () => {
		const vayneW = (await currentChampion("Vayne")).abilities.spells[1]
		const camilleW = (await currentChampion("Camille")).abilities.spells[1]

		expect(vayneW?.damage?.[0]).toMatchObject({
			type: "true",
			parts: [{ value: { byRank: [0.04, 0.055, 0.07, 0.085, 0.1] } }],
			ofTargetHealth: "maximum",
		})
		expect(camilleW?.damage?.[1]).toMatchObject({
			parts: [
				{ value: { byRank: [0.07, 0.075, 0.08, 0.085, 0.09] } },
				{ stat: "attackDamage", part: "bonus", ratio: 0.00025 },
			],
			ofTargetHealth: "maximum",
		})
	})

	test("Darius: Decimate's blade 50 to 170 (+100% to 140% AD)", async () => {
		const decimate = (await currentChampion("Darius")).abilities.spells[0]

		expect(decimate?.damage?.[0]?.parts).toEqual([
			{ value: { byRank: [50, 80, 110, 140, 170] } },
			{ stat: "attackDamage", ratio: { byRank: [1, 1.1, 1.2, 1.3, 1.4] } },
		])
	})

	test("Ziggs: Short Fuse 20 to 160 by level (+50% AP)", async () => {
		const { passive } = (await currentChampion("Ziggs")).abilities
		const [level, ap] = passive.damage?.[0]?.parts ?? []

		expect(
			level &&
				"value" in level &&
				[7, 13].map((at) => byLevelAt(level.value, at)),
		).toEqual([48, 100])
		expect(ap).toEqual({ stat: "abilityPower", ratio: 0.5 })
	})
})
