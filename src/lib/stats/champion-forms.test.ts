import { describe, expect, test } from "bun:test"
import type { ChampionForm } from "@schemas/champion"
import { comparedForm, formChanges, selectedForm } from "./champion-forms"

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
