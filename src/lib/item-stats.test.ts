import { describe, expect, test } from "bun:test"
import { itemStatLines } from "./item-stats"

describe("itemStatLines", () => {
	test("formats flat stats with a plus sign and percent stats as percentages", () => {
		expect(
			itemStatLines({
				attackDamage: 36,
				attackSpeedPercent: 0.3,
				omnivampPercent: 0.025,
			}),
		).toEqual([
			{ stat: "attackDamage", value: "+36", label: "Attack Damage" },
			{ stat: "attackSpeedPercent", value: "+30%", label: "Attack Speed" },
			{ stat: "omnivampPercent", value: "+2.5%", label: "Omnivamp" },
		])
	})

	test("lists stats in schema order, whatever the input order", () => {
		const lines = itemStatLines({ health: 333, attackDamage: 36 })
		expect(lines.map(({ stat }) => stat)).toEqual(["attackDamage", "health"])
	})

	test("keeps the sign of a negative value", () => {
		expect(itemStatLines({ cooldownPercent: -0.1 })).toEqual([
			{ stat: "cooldownPercent", value: "-10%", label: "Cooldowns" },
		])
	})

	test("labels flat regen per 5 seconds", () => {
		expect(itemStatLines({ healthRegen: 4 })[0].label).toBe(
			"Health Regen per 5s",
		)
	})

	test("returns nothing for an item without stats", () => {
		expect(itemStatLines({})).toEqual([])
	})
})
