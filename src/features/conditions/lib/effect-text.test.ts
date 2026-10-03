import { describe, expect, test } from "bun:test"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { Effect, Trigger } from "@/lib/effects/effect"
import type { Condition } from "./conditions"
import { conditionText, grantText } from "./effect-text"

function condition(
	trigger: Trigger,
	fields: { duration?: number; spell?: SummonerSpell } = {},
): Condition {
	const effect: Effect = {
		id: "test",
		source: { kind: "rune", runeKey: "NimbusCloak" },
		trigger,
		grants: [],
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Nimbus_Cloak",
	}
	return {
		effect: { id: "test", effect, name: "Test", icon: "", spell: fields.spell },
		isOn: false,
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
})
