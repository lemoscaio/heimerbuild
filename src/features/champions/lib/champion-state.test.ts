import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { CHAMPION_FORMS } from "../../../../scripts/sync-data/overrides/champion-forms"
import {
	currentHealthValue,
	readChampionState,
	readCurrentHealth,
} from "./champion-state"

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
			{ level: 1, form: undefined, formValue: undefined },
		)
	})
})

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

function bind(effect: Effect): BuildEffect {
	return { id: effect.id, effect, name: effect.id, icon: "" }
}

const barrier = bind({
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	duration: 2.5,
	grants: [{ kind: "shield", amount: 280 }],
	since: "16.19",
	sourceUrl: `${WIKI}Barrier`,
})
const bloodlust = bind({
	id: "tryndamere-q-passive",
	source: { kind: "ability", championKey: "Tryndamere", slot: "Q" },
	trigger: { kind: "always" },
	part: "passive",
	grants: [
		{
			kind: "stat",
			stat: "attackDamage",
			amount: { by: "missingHealth", max: 80, fullAt: 90 },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Tryndamere`,
})

describe("readCurrentHealth", () => {
	test("keeps the current health while an effect reads it", () => {
		expect(readCurrentHealth(40, [barrier, bloodlust])).toBe(40)
	})

	test("drops it at full health or when no effect reads it", () => {
		expect(readCurrentHealth(100, [bloodlust])).toBeUndefined()
		expect(readCurrentHealth(40, [barrier])).toBeUndefined()
	})

	test("keeps it as given while the effects load", () => {
		expect(readCurrentHealth(40, undefined)).toBe(40)
	})
})

describe("currentHealthValue", () => {
	test("saves a health below full, and no value at full health", () => {
		expect(currentHealthValue(40)).toBe(40)
		expect(currentHealthValue(100)).toBeUndefined()
	})
})
