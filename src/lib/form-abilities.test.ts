import { describe, expect, test } from "bun:test"
import type { ChampionAbilities, ChampionSpell } from "@schemas/champion"
import { abilitiesInForm, spellInForm } from "./form-abilities"

function spell(slot: ChampionSpell["slot"], name: string): ChampionSpell {
	return {
		slot,
		name,
		description: name,
		icon: `https://example.test/${slot}.png`,
		maxRank: 1,
		cooldown: [6],
		rankValues: [],
	}
}

const JAYCE: ChampionAbilities = {
	passive: {
		name: "Hextech Capacitor",
		description: "",
		icon: "https://example.test/passive.png",
	},
	spells: [
		spell("Q", "To the Skies!"),
		spell("W", "Lightning Field"),
		spell("E", "Thundering Blow"),
		spell("R", "Mercury Cannon"),
	],
	forms: {
		cannon: {
			passive: {
				name: "Hextech Capacitor",
				description: "",
				icon: "https://example.test/passive-cannon.png",
			},
			Q: spell("Q", "Shock Blast"),
			R: spell("R", "Mercury Hammer"),
		},
	},
}

function names({ spells }: ChampionAbilities) {
	return spells.map(({ name }) => name)
}

describe("abilitiesInForm", () => {
	test("puts the form's abilities in their slots and keeps the others", () => {
		expect(names(abilitiesInForm(JAYCE, "cannon"))).toEqual([
			"Shock Blast",
			"Lightning Field",
			"Thundering Blow",
			"Mercury Hammer",
		])
		expect(abilitiesInForm(JAYCE, "cannon").passive.icon).toBe(
			"https://example.test/passive-cannon.png",
		)
	})

	test("the default form, an unknown form or no form keeps the abilities as they are", () => {
		expect(abilitiesInForm(JAYCE, "hammer")).toBe(JAYCE)
		expect(abilitiesInForm(JAYCE, "mega")).toBe(JAYCE)
		expect(abilitiesInForm(JAYCE, undefined)).toBe(JAYCE)
	})
})

describe("spellInForm", () => {
	test("reads the form's ability in a slot, else the default one", () => {
		expect(spellInForm(JAYCE, "Q", "cannon")?.name).toBe("Shock Blast")
		expect(spellInForm(JAYCE, "W", "cannon")?.name).toBe("Lightning Field")
		expect(spellInForm(JAYCE, "Q", undefined)?.name).toBe("To the Skies!")
	})
})
