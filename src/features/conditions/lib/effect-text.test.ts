import { describe, expect, test } from "bun:test"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { Effect, Trigger } from "@/lib/effects/effect"
import type { Condition } from "./conditions"
import {
	conditionText,
	grantText,
	partLabel,
	stackedOutText,
	valuesText,
} from "./effect-text"

function condition(
	trigger: Trigger,
	fields: { duration?: number; spell?: SummonerSpell } = {},
): Condition {
	const effect: Effect = {
		id: "test",
		source: { kind: "rune", runeKey: "NimbusCloak" },
		trigger,
		grants: [],
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Nimbus_Cloak",
	}
	return {
		effect: { id: "test", effect, name: "Test", icon: "", spell: fields.spell },
		isOn: false,
		isSwitchable: true,
		usesCurrentHealth: false,
		usesGameTime: false,
		grants: [],
		duration: fields.duration,
	}
}

const FLASH = { name: "Flash" } as SummonerSpell

describe("conditionText", () => {
	test("says how long an effect lasts after its trigger", () => {
		expect(
			conditionText(condition({ kind: "after-use" }, { duration: 10 })),
		).toBe("For 10 s after casting")
		expect(
			conditionText(
				condition({ kind: "after-summoner" }, { duration: 2, spell: FLASH }),
			),
		).toBe("For 2 s after casting Flash")
		expect(conditionText(condition({ kind: "after-ability" }))).toBe(
			"After an ability",
		)
	})

	test("names the state a while-effect needs", () => {
		expect(
			conditionText(
				condition({ kind: "while", condition: "not-damaged-recently" }),
			),
		).toBe("Not hit by a champion or turret for 5 s")
	})
})

describe("grantText", () => {
	test("shows stats like item stats, and shields and heals as whole numbers", () => {
		expect(
			grantText({ kind: "stat", stat: "movementSpeedPercent", value: 0.3529 }),
		).toBe("+35.3% Move Speed")
		expect(grantText({ kind: "shield", value: 269.4118 })).toBe("269 shield")
		expect(grantText({ kind: "heal", value: 192 })).toBe("192 heal")
	})

	test("says which stat a stat-dependent bonus reads", () => {
		expect(
			grantText({
				kind: "stat",
				stat: "armor",
				value: 24.6,
				basis: { stat: "armor", ratio: 0.3 },
			}),
		).toBe("+24.6 Armor (30% of Armor)")
		expect(
			grantText({
				kind: "stat",
				stat: "movementSpeedPercent",
				value: 0.06,
				basis: { stat: "abilityPower", ratio: 0.0002 },
			}),
		).toBe("+6% Move Speed (2% per 100 Ability Power)")
	})
})

describe("valuesText", () => {
	const ap = (value: number) =>
		({ kind: "stat", stat: "abilityPower", value }) as const

	test("joins the grants, and adds the next game time step when there is one", () => {
		const row = condition({ kind: "always" })
		expect(valuesText({ ...row, grants: [ap(24)] })).toBe("+24 Ability Power")
		expect(
			valuesText({
				...row,
				grants: [ap(24)],
				next: { gameTime: 30, grants: [ap(48)] },
			}),
		).toBe("+24 Ability Power (next: +48 Ability Power at 30 min)")
	})
})

describe("partLabel and stackedOutText", () => {
	const passive: Effect = {
		id: "teemo-w-passive",
		source: { kind: "ability", championKey: "Teemo", slot: "W" },
		trigger: { kind: "while", condition: "not-damaged-recently" },
		part: "passive",
		grants: [],
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Teemo",
	}
	const active = { ...passive, id: "teemo-w-active", part: "active" as const }

	function row(effect: Effect, stackedOutBy?: Effect): Condition {
		const bind = (entry: Effect) => ({
			id: entry.id,
			effect: entry,
			name: "Move Quick",
			icon: "",
		})
		return {
			effect: bind(effect),
			isOn: true,
			isSwitchable: true,
			usesCurrentHealth: false,
			usesGameTime: false,
			grants: [],
			stackedOutBy: stackedOutBy && bind(stackedOutBy),
		}
	}

	test("labels an ability's part, and nothing for an effect without parts", () => {
		expect(partLabel(row(passive))).toBe("Passive")
		expect(partLabel(row(active))).toBe("Active")
		expect(partLabel(condition({ kind: "after-use" }))).toBeUndefined()
	})

	test("says which part stands in for a stacked-out row", () => {
		expect(stackedOutText(row(passive, active))).toBe("Replaced by the active")
		expect(stackedOutText(row(passive))).toBeUndefined()
	})
})
