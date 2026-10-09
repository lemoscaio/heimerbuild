import { describe, expect, test } from "bun:test"
import {
	type CombatItem,
	MAX_COMBAT_STEPS,
	type OutcomeChoices,
} from "./combat"
import {
	normalizeComboChoices,
	readComboChoices,
	readComboItems,
	readComboStart,
	serializeComboChoices,
	serializeComboItems,
	serializeComboStart,
	TARGET_PARAM_PATTERN,
} from "./combo-link"

const EVERY_KIND: CombatItem[] = [
	{ kind: "situation", effectId: "hail-of-blades" },
	{ kind: "attack" },
	{ kind: "ability", slot: "Q", variant: "handle" },
	{ kind: "ability", slot: "W" },
	{ kind: "summoner", slot: 0 },
	{ kind: "summoner", slot: 1 },
	{ kind: "wait", seconds: 0.25 },
	{ kind: "wait", seconds: 1.5 },
	{ kind: "wait", seconds: 30 },
]

describe("the combo value", () => {
	test("writes each step and marker as a short token, in order", () => {
		expect(serializeComboItems(EVERY_KIND)).toBe(
			"m-hail-of-blades.aa.q-handle.w.d.f.t0_25.t1_5.t30",
		)
	})

	test("reads back what it writes", () => {
		expect(readComboItems(serializeComboItems(EVERY_KIND))).toEqual(EVERY_KIND)
	})

	test("keeps a time in the area in seconds, `_` as the decimal point (issue 427)", () => {
		const items: CombatItem[] = [
			{ kind: "ability", slot: "E", inArea: 1.5 },
			{ kind: "ability", slot: "Q", inArea: 0.25 },
			{ kind: "ability", slot: "R", inArea: 15 },
		]

		expect(serializeComboItems(items)).toBe("e-1_5s.q-0_25s.r-15s")
		expect(readComboItems("e-1_5s.q-0_25s.r-15s")).toEqual(items)
	})

	test("reads the time presets of older links as the same seconds: 2 s in Poison Trail, 3 s in Tormented Shadow", () => {
		expect(readComboItems("q-2s.w-3s.q-0s")).toEqual([
			{ kind: "ability", slot: "Q", inArea: 2 },
			{ kind: "ability", slot: "W", inArea: 3 },
			{ kind: "ability", slot: "Q", inArea: 0 },
		])
	})

	test("keeps a variant that is a number, without seconds: Pyroclasm's hits", () => {
		expect(readComboItems("r-2")).toEqual([
			{ kind: "ability", slot: "R", variant: "2" },
		])
	})

	test("is no value for an empty combo", () => {
		expect(serializeComboItems([])).toBeUndefined()
		expect(readComboItems(undefined)).toEqual([])
	})

	test("drops only the tokens it can't read", () => {
		expect(readComboItems("aa.x.Q.q-.t.t1_5_0.m-.m-Bad.g.e-far")).toEqual([
			{ kind: "attack" },
			{ kind: "ability", slot: "E", variant: "far" },
		])
	})

	test(`keeps the first ${MAX_COMBAT_STEPS} entries`, () => {
		const long = Array(MAX_COMBAT_STEPS + 5)
			.fill("aa")
			.join(".")
		expect(readComboItems(long)).toHaveLength(MAX_COMBAT_STEPS)
	})
})

describe("the choices value", () => {
	const byItem: (OutcomeChoices | undefined)[] = [
		undefined,
		{ "empowered:hail-of-blades": false, "mark-consumed:quinn-harrier": true },
		undefined,
		{ "damage-over-time:teemo-e": false, "mark-applied:flux": true },
	]

	test("writes each choice as its step's position, the outcome and the answer", () => {
		expect(serializeComboChoices(byItem)).toBe(
			"2e-hail-of-blades-n.2c-quinn-harrier-y.4d-teemo-e-n.4a-flux-y",
		)
	})

	test("reads back what it writes, by item index", () => {
		const [, second, , fourth] = byItem
		expect(readComboChoices(serializeComboChoices(byItem))).toEqual({
			1: { ...second },
			3: { ...fourth },
		})
	})

	test("is no value without choices", () => {
		expect(serializeComboChoices([undefined, {}])).toBeUndefined()
		expect(readComboChoices(undefined)).toEqual({})
	})

	test("drops only the tokens it can't read", () => {
		expect(
			normalizeComboChoices(
				"2e-hail-of-blades-n.0e-ghost-y.31e-ghost-y.2x-ghost-y.2e-ghost.1c-harrier-y",
			),
		).toBe("1c-harrier-y.2e-hail-of-blades-n")
	})
})

describe("the target value", () => {
	test("takes a preset's id or three whole numbers", () => {
		expect(TARGET_PARAM_PATTERN.test("tank")).toBe(true)
		expect(TARGET_PARAM_PATTERN.test("1800-60-45")).toBe(true)
		expect(TARGET_PARAM_PATTERN.test("1800-60")).toBe(false)
		expect(TARGET_PARAM_PATTERN.test("1800.5-60-45")).toBe(false)
		expect(TARGET_PARAM_PATTERN.test("Tank")).toBe(false)
	})
})

describe("the start value (issue 317)", () => {
	test("names each effect that starts on cooldown, and reads back what it writes", () => {
		const ids = ["electrocute", "hail-of-blades"]

		expect(serializeComboStart(ids)).toBe("-electrocute.-hail-of-blades")
		expect(readComboStart(serializeComboStart(ids))).toEqual(ids)
	})

	test("every cooldown ready writes no value", () => {
		expect(serializeComboStart([])).toBeUndefined()
		expect(readComboStart(undefined)).toEqual([])
	})

	test("drops unreadable tokens and repeats", () => {
		expect(
			readComboStart("-electrocute.ready.-Electrocute.-electrocute"),
		).toEqual(["electrocute"])
	})
})
