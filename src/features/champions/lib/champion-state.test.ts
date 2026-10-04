import { describe, expect, test } from "bun:test"
import { CHAMPION_FORMS } from "../../../../scripts/sync-data/overrides/champion-forms"
import { readChampionState } from "./champion-state"

const forms = CHAMPION_FORMS.find(({ target }) => target === "Gnar")?.apply(
	undefined,
)
const gnar = { forms }
const heimerdinger = { forms: undefined }

describe("readChampionState", () => {
	test("keeps the form value as given until the champion loads", () => {
		expect(readChampionState(undefined, { level: 7, form: "mega" })).toEqual({
			level: 7,
			form: undefined,
			formValue: "mega",
			currentHealth: 100,
		})
	})

	test("selects the named form and keeps it in the value", () => {
		const state = readChampionState(gnar, { level: 7, form: "mega" })

		expect(state.form?.id).toBe("mega")
		expect(state.formValue).toBe("mega")
	})

	test("the default form, named or not, stays out of the value", () => {
		for (const form of ["mini", undefined, "cougar"]) {
			const state = readChampionState(gnar, { level: 1, form })

			expect(state.form?.id).toBe("mini")
			expect(state.formValue).toBeUndefined()
		}
	})

	test("a champion without forms has no form", () => {
		expect(readChampionState(heimerdinger, { level: 1, form: "mega" })).toEqual(
			{ level: 1, form: undefined, formValue: undefined, currentHealth: 100 },
		)
	})

	test("reads the current health, full when absent", () => {
		expect(
			readChampionState(gnar, { level: 1, form: undefined, currentHealth: 40 })
				.currentHealth,
		).toBe(40)
		expect(
			readChampionState(undefined, { level: 1, form: undefined }).currentHealth,
		).toBe(100)
	})
})

describe("readChampionState, a form that needs an ability point", () => {
	const shyvana = {
		forms: [
			{ id: "human", name: "Human" },
			{
				id: "dragon",
				name: "Dragon",
				requires: { slot: "R" as const, minRank: 1 },
			},
		],
	}
	const value = { level: 6, form: "dragon" }

	test("is the default form, out of the value, until the point is spent", () => {
		const state = readChampionState(shyvana, value, {
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
		})

		expect(state.form?.id).toBe("human")
		expect(state.formValue).toBeUndefined()
	})

	test("is selected once the point is spent, or while the ranks load", () => {
		const learned = readChampionState(shyvana, value, {
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
		})

		expect(learned.formValue).toBe("dragon")
		expect(readChampionState(shyvana, value).formValue).toBe("dragon")
	})
})
