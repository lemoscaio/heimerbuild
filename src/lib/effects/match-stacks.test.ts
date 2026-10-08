import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect, MatchStackSource } from "./effect"
import { lockedGrants, resolveAmount, resolveGrants } from "./evaluate"
import {
	clampMatchStacks,
	matchStackSources,
	nextMatchStacksStep,
	parseMatchStacks,
	serializeMatchStacks,
	usedMatchStacks,
	withMatchStacks,
} from "./match-stacks"

const EVIL: MatchStackSource = {
	id: "phenomenal-evil",
	name: "Phenomenal Evil stacks",
	sliderMax: 1000,
}

function stackedEffect(ratio?: number): Effect {
	return {
		id: "stacked",
		source: { kind: "ability", championKey: "Veigar", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: EVIL, ...(ratio && { ratio }) },
			},
		],
		since: "16.19",
		sourceUrl: "https://example.com",
	}
}

function bound(effect: Effect): BuildEffect {
	return { id: effect.id, effect, name: "Phenomenal Evil Power", icon: "" }
}

describe("the matchStacks amount", () => {
	const [grant] = stackedEffect(2).grants
	const amount = grant && "amount" in grant ? grant.amount : 0
	const effect = bound(stackedEffect(2))

	test("is its ratio per stack of its source", () => {
		const context = { level: 9, matchStacks: { "phenomenal-evil": 120 } }
		expect(resolveAmount(amount, effect, context)).toBe(240)
	})

	test("is 0 without stacks of its source", () => {
		expect(resolveAmount(amount, effect, { level: 9 })).toBe(0)
		const other = { level: 9, matchStacks: { "siphoning-strike": 120 } }
		expect(resolveAmount(amount, effect, other)).toBe(0)
	})

	test("counts whole `per` stacks and stops at `max`", () => {
		const stepped = {
			by: "matchStacks",
			source: EVIL,
			ratio: 10,
			per: 20,
			max: 25,
		} as const
		const at = (count: number) =>
			resolveAmount(stepped, effect, {
				level: 9,
				matchStacks: { "phenomenal-evil": count },
			})

		expect(at(19)).toBe(0)
		expect(at(39)).toBe(10)
		expect(at(40)).toBe(20)
		expect(at(100)).toBe(25)
	})

	test("reads a table ratio at the build's state", () => {
		const perRank = {
			by: "matchStacks",
			source: EVIL,
			ratio: { by: "rankValue", label: "Health per Stack" },
		} as const
		const feast: BuildEffect = {
			...effect,
			slot: "R",
			rankValues: [{ label: "Health per Stack", values: [80, 120, 160] }],
		}
		const context = {
			level: 16,
			ranks: { Q: 5, W: 5, E: 5, R: 2 },
			matchStacks: { "phenomenal-evil": 4 },
		}

		expect(resolveAmount(perRank, feast, context)).toBe(480)
	})

	test("names the sources its effect reads", () => {
		expect(matchStackSources(stackedEffect())).toEqual([EVIL])
	})
})

const GLORY: MatchStackSource = {
	id: "mejai-stacks",
	name: "Mejai's Glory",
	sliderMax: 25,
	capped: true,
}

/** Mejai's: 5 AP per Glory, and 10% move speed from 10 Glory. */
const glory: BuildEffect = bound({
	id: "mejai-glory",
	source: { kind: "item", itemId: "3041" },
	trigger: { kind: "always" },
	grants: [
		{
			kind: "stat",
			stat: "abilityPower",
			amount: { by: "matchStacks", source: GLORY, ratio: 5 },
		},
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: 0.1,
			from: { source: GLORY, stacks: 10 },
		},
	],
	since: "16.19",
	sourceUrl: "https://example.com",
})

describe("a capped source", () => {
	const at = (count: number) => ({
		level: 9,
		matchStacks: { "mejai-stacks": count },
	})

	test("reads a larger count as its cap", () => {
		expect(resolveGrants(glory, at(40))[0]?.value).toBe(125)
	})

	test("clamps a typed count to its cap, an uncapped one to 9999", () => {
		expect(clampMatchStacks(40, GLORY)).toBe(25)
		expect(clampMatchStacks(40, EVIL)).toBe(40)
		expect(clampMatchStacks(12345)).toBe(9999)
	})

	test("is saved at its cap at most", () => {
		expect(usedMatchStacks({ "mejai-stacks": 40 }, [glory.effect])).toEqual({
			"mejai-stacks": 25,
		})
	})
})

describe("a grant from a stack threshold", () => {
	const at = (count: number) => ({
		level: 9,
		matchStacks: { "mejai-stacks": count },
	})

	test("holds only from its count on", () => {
		const kinds = (count: number) =>
			resolveGrants(glory, at(count)).map((grant) =>
				grant.kind === "stat" ? grant.stat : grant.kind,
			)

		expect(kinds(9)).toEqual(["abilityPower"])
		expect(kinds(10)).toEqual(["abilityPower", "movementSpeedPercent"])
	})

	test("is locked below it, with what it gives there", () => {
		expect(lockedGrants(glory, at(4))).toEqual([
			{
				threshold: { source: GLORY, stacks: 10 },
				grants: [{ kind: "stat", stat: "movementSpeedPercent", value: 0.1 }],
			},
		])
		expect(lockedGrants(glory, at(10))).toEqual([])
	})

	test("names its source among the effect's", () => {
		const gated: Effect = {
			...glory.effect,
			grants: glory.effect.grants.slice(1),
		}
		expect(matchStackSources(gated)).toEqual([GLORY])
	})
})

describe("a stepped amount", () => {
	const MARKS: MatchStackSource = {
		id: "kindred-marks",
		name: "Marks of the Kindred",
		sliderMax: 30,
	}
	const range: Effect = {
		id: "kindred-passive",
		source: { kind: "ability", championKey: "Kindred", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "attackRange",
				amount: {
					by: "matchStacks",
					source: MARKS,
					steps: [
						{ from: 4, value: 75 },
						{ from: 7, value: 100 },
					],
				},
			},
		],
		since: "16.19",
		sourceUrl: "https://example.com",
	}
	const at = (count: number) => ({
		level: 9,
		matchStacks: { "kindred-marks": count },
	})

	test("is the last step the count reached, 0 before the first", () => {
		const value = (count: number) =>
			resolveGrants(bound(range), at(count))[0]?.value

		expect(value(3)).toBe(0)
		expect(value(4)).toBe(75)
		expect(value(6)).toBe(75)
		expect(value(40)).toBe(100)
	})

	test("knows the next count that changes it, none past the last step", () => {
		const next = (count: number) =>
			nextMatchStacksStep(range, MARKS, at(count).matchStacks)

		expect(next(0)).toBe(4)
		expect(next(4)).toBe(7)
		expect(next(7)).toBeUndefined()
	})
})

describe("the build's match stacks", () => {
	test("set a source's count, 0 removing it", () => {
		const stacks = withMatchStacks(undefined, "siphoning-strike", 250)
		expect(stacks).toEqual({ "siphoning-strike": 250 })
		expect(withMatchStacks(stacks, "phenomenal-evil", 80)).toEqual({
			"siphoning-strike": 250,
			"phenomenal-evil": 80,
		})
		expect(withMatchStacks(stacks, "siphoning-strike", 0)).toBeUndefined()
	})

	test("drop the sources no effect reads, as given while the effects load", () => {
		const stacks = { "siphoning-strike": 250, "phenomenal-evil": 80 }
		expect(usedMatchStacks(stacks, [stackedEffect()])).toEqual({
			"phenomenal-evil": 80,
		})
		expect(usedMatchStacks(stacks, [])).toBeUndefined()
		expect(usedMatchStacks(stacks, undefined)).toBe(stacks)
	})
})

describe("the stacks link param", () => {
	test("round-trips each source's count", () => {
		const stacks = { "siphoning-strike": 250, "phenomenal-evil": 80 }
		const value = serializeMatchStacks(stacks)
		expect(value).toBe("siphoning-strike-250.phenomenal-evil-80")
		expect(parseMatchStacks(value)).toEqual(stacks)
	})

	test("writes nothing without stacks, and leaves 0 counts out", () => {
		expect(serializeMatchStacks(undefined)).toBeUndefined()
		expect(serializeMatchStacks({ "siphoning-strike": 0 })).toBeUndefined()
		expect(parseMatchStacks("siphoning-strike-0")).toBeUndefined()
	})

	test("reads an unreadable value as none", () => {
		expect(parseMatchStacks("siphoning-strike")).toBeUndefined()
		expect(parseMatchStacks("siphoning-strike-12345")).toBeUndefined()
		expect(parseMatchStacks("Siphoning-250")).toBeUndefined()
	})
})
