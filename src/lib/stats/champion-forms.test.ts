import { describe, expect, test } from "bun:test"
import type { ChampionForm } from "@schemas/champion"
import {
	comparedForm,
	formChanges,
	isFormUnlocked,
	selectedForm,
} from "./champion-forms"

const forms: ChampionForm[] = [
	{ id: "human", name: "Human" },
	{ id: "cougar", name: "Cougar", attackType: "melee" },
]

describe("selectedForm", () => {
	test("finds the form by id", () => {
		expect(selectedForm(forms, "cougar")?.name).toBe("Cougar")
	})

	test("falls back to the default form for an absent or unknown id", () => {
		expect(selectedForm(forms, undefined)?.id).toBe("human")
		expect(selectedForm(forms, "spider")?.id).toBe("human")
	})

	test("is undefined for a champion without forms", () => {
		expect(selectedForm(undefined, "cougar")).toBeUndefined()
	})
})

describe("formChanges", () => {
	test("is the selected form only when it is not the default", () => {
		expect(formChanges(forms, "cougar")?.id).toBe("cougar")
		expect(formChanges(forms, "human")).toBeUndefined()
		expect(formChanges(forms, "spider")).toBeUndefined()
	})
})

describe("comparedForm", () => {
	test("is the other form of two", () => {
		expect(comparedForm(forms, "cougar")?.id).toBe("human")
		expect(comparedForm(forms, undefined)?.id).toBe("cougar")
	})

	test("is undefined for a champion without forms", () => {
		expect(comparedForm(undefined, undefined)).toBeUndefined()
	})
})

describe("forms that need an ability point", () => {
	const shyvana: ChampionForm[] = [
		{ id: "human", name: "Human" },
		{ id: "dragon", name: "Dragon", requires: { slot: "R", minRank: 1 } },
	]
	const ranks = (R: number) => ({ Q: 1, W: 0, E: 0, R })

	test("a form is unlocked once its ability has the rank it needs", () => {
		const [human, dragon] = shyvana as [ChampionForm, ChampionForm]

		expect(isFormUnlocked(dragon, ranks(0))).toBe(false)
		expect(isFormUnlocked(dragon, ranks(1))).toBe(true)
		expect(isFormUnlocked(human, ranks(0))).toBe(true)
	})

	test("unknown ranks never lock a form", () => {
		expect(selectedForm(shyvana, "dragon")?.id).toBe("dragon")
	})

	test("a locked form falls back to the default one", () => {
		expect(selectedForm(shyvana, "dragon", { ranks: ranks(0) })?.id).toBe(
			"human",
		)
		expect(formChanges(shyvana, "dragon", { ranks: ranks(0) })).toBeUndefined()
		expect(formChanges(shyvana, "dragon", { ranks: ranks(2) })?.id).toBe(
			"dragon",
		)
	})
})
