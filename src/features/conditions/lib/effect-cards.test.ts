import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { MANAFLOW_MANA } from "@/lib/effects/registries/item-effects"
import type { Condition } from "./conditions"
import { conditionKey, effectCards } from "./effect-cards"

function condition(id: string, fields: Partial<BuildEffect>): Condition {
	const effect: Effect = {
		id,
		source: { kind: "rune", runeKey: "Test" },
		trigger: { kind: "after-use" },
		grants: [],
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Teemo",
	}
	return {
		effect: { id, effect, name: id, icon: `${id}.png`, ...fields },
		isOn: false,
		isSwitchable: true,
		usesCurrentHealth: false,
		usesGameTime: false,
		stackSources: [],
		locked: [],
		grants: [],
	}
}

const passive = condition("teemo-w-passive", { name: "Move Quick", slot: "W" })
const active = condition("teemo-w-active", { name: "Move Quick", slot: "W" })
const ghost = condition("ghost", { name: "Ghost" })
const nimbusAfterGhost = condition("nimbus-cloak-ghost", {
	name: "Nimbus Cloak",
})
const nimbusAfterFlash = condition("nimbus-cloak-flash", {
	name: "Nimbus Cloak",
})

function shape(cards: ReturnType<typeof effectCards>) {
	return cards.map(({ title, conditions }) => [
		title,
		conditions.map(({ effect }) => effect.id),
	])
}

describe("effectCards", () => {
	test("an ability's parts share one card titled with its name and key", () => {
		expect(shape(effectCards([passive, active, ghost]))).toEqual([
			["Move Quick (W)", ["teemo-w-passive", "teemo-w-active"]],
			["Ghost", ["ghost"]],
		])
	})

	test("every other effect keeps a card of its own, even from the same rune", () => {
		expect(shape(effectCards([nimbusAfterGhost, nimbusAfterFlash]))).toEqual([
			["Nimbus Cloak", ["nimbus-cloak-ghost"]],
			["Nimbus Cloak", ["nimbus-cloak-flash"]],
		])
	})

	test("Manamune's card and Muramana's are one card at 360, and the row with the count keeps its key", () => {
		const itemCondition = (id: string, itemId: string, name: string) => {
			const base = condition(id, { name })
			return {
				...base,
				effect: {
					...base.effect,
					effect: { ...base.effect.effect, source: { kind: "item", itemId } },
				},
			} satisfies Condition
		}
		const manamune = itemCondition("manamune-awe", "3004", "Manamune")
		const muramana = itemCondition("muramana-awe", "3042", "Muramana")
		const [before] = effectCards([manamune])
		const [after] = effectCards([muramana])

		expect(before?.key).toBe(after?.key)
		expect(conditionKey(manamune, [MANAFLOW_MANA])).toBe(
			conditionKey(muramana, [MANAFLOW_MANA]),
		)
		expect(conditionKey(manamune, [])).toBe("manamune-awe")
	})
})
