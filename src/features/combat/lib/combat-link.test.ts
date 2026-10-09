import { describe, expect, test } from "bun:test"
import { isSameCombatLink, readCombatLink, toCombatLink } from "./combat-link"
import { type CombatState, EMPTY_COMBAT } from "./combat-state"

const COMBO: CombatState = {
	entries: [
		{ id: 4, action: { kind: "situation", effectId: "hail-of-blades" } },
		{ id: 2, action: { kind: "attack" } },
		{ id: 7, action: { kind: "ability", slot: "Q", variant: "handle" } },
		{ id: 3, action: { kind: "wait", seconds: 1.5 } },
		{ id: 9, action: { kind: "ability", slot: "E", inArea: 1.5 } },
	],
	free: true,
	choices: { 2: { "empowered:hail-of-blades": false } },
	onCooldown: [],
}

describe("the combo's link values", () => {
	test("hold its entries in order, free mode and the choices by position", () => {
		expect(toCombatLink(COMBO)).toEqual({
			combo: "m-hail-of-blades.aa.q-handle.t1_5.e-1_5s",
			free: true,
			choices: "2e-hail-of-blades-n",
		})
	})

	test("open the same combo, its entries numbered in order", () => {
		const read = readCombatLink(toCombatLink(COMBO))
		expect(read.entries.map(({ action }) => action)).toEqual(
			COMBO.entries.map(({ action }) => action),
		)
		expect(read.entries.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5])
		expect(read.free).toBe(true)
		expect(read.choices).toEqual({ 2: { "empowered:hail-of-blades": false } })
		expect(toCombatLink(read)).toEqual(toCombatLink(COMBO))
	})

	test("leave out an empty combo in strict mode", () => {
		expect(toCombatLink(EMPTY_COMBAT)).toEqual({
			combo: undefined,
			free: undefined,
			choices: undefined,
			start: undefined,
		})
		expect(readCombatLink({})).toEqual(EMPTY_COMBAT)
	})

	test("keep the choices while free mode is off", () => {
		const off = toCombatLink({ ...COMBO, free: false })
		expect(off.free).toBeUndefined()
		expect(readCombatLink(off).choices).toEqual(COMBO.choices)
	})

	test("bring a wait into its range and drop a choice at a marker", () => {
		const read = readCombatLink({
			combo: "m-hail-of-blades.t45",
			choices: "1e-hail-of-blades-y",
		})
		expect(read.entries[1]?.action).toEqual({ kind: "wait", seconds: 30 })
		expect(read.choices).toEqual({})
	})

	test("hold only the cooldowns the combo starts on: every one ready writes none", () => {
		const onCooldown = {
			...COMBO,
			onCooldown: ["electrocute", "hail-of-blades"],
		}

		expect(toCombatLink(onCooldown).start).toBe("-electrocute.-hail-of-blades")
		expect(toCombatLink(COMBO).start).toBeUndefined()
		expect(readCombatLink(toCombatLink(onCooldown)).onCooldown).toEqual([
			"electrocute",
			"hail-of-blades",
		])
	})

	test("are another combo when a cooldown starts otherwise", () => {
		expect(
			isSameCombatLink({ combo: "aa" }, { combo: "aa", start: "-electrocute" }),
		).toBe(false)
	})

	test("are the same combo whether free mode is off or absent", () => {
		expect(
			isSameCombatLink({ combo: "aa", free: false }, { combo: "aa" }),
		).toBe(true)
		expect(isSameCombatLink({ combo: "aa" }, { combo: "aa.aa" })).toBe(false)
	})
})
