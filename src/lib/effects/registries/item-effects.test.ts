import { describe, expect, test } from "bun:test"
import { ITEM_EFFECTS } from "./item-effects"

function grantsOf(id: string) {
	return ITEM_EFFECTS.find((effect) => effect.id === id)?.grants
}

// Wiki and CommunityDragon 16.19: the next attack within 10 s of an ability, 1.5 s cooldown.
describe("spellblade items", () => {
	test("follow an ability, last 10 s and come back after 1.5 s", () => {
		expect(ITEM_EFFECTS.map(({ source }) => source)).toEqual([
			{ kind: "item", itemId: "3057" },
			{ kind: "item", itemId: "3078" },
			{ kind: "item", itemId: "3100" },
		])
		for (const effect of ITEM_EFFECTS) {
			expect(effect.trigger).toEqual({ kind: "after-ability" })
			expect(effect.duration).toBe(10)
			expect(effect.cooldown).toBe(1.5)
		}
	})

	test("deal 100% (Sheen), 200% (Trinity Force) or 75% base AD + 45% AP (Lich Bane)", () => {
		expect(grantsOf("sheen-spellblade")).toEqual([
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 1 },
			},
		])
		expect(grantsOf("trinity-force-spellblade")).toEqual([
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 2 },
			},
		])
		expect(grantsOf("lich-bane-spellblade")).toEqual([
			{
				kind: "damage",
				damageType: "magic",
				ratios: { baseAttackDamage: 0.75, abilityPower: 0.45 },
			},
			{ kind: "stat", stat: "attackSpeedPercent", amount: 0.5 },
		])
	})
})
