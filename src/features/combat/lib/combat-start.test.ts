import { describe, expect, test } from "bun:test"
import type { BuildEffect } from "@/lib/effects/effect"
import { combatStartChips } from "./combat-start"

function effect(id: string, name: string): BuildEffect {
	return {
		id,
		name,
		icon: `${id}.png`,
		effect: {
			id,
			source: { kind: "rune", runeKey: name },
			trigger: { kind: "on-attack" },
			cooldown: 10,
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
		},
	}
}

describe("combatStartChips", () => {
	test("one chip per cooldown, ready unless the combo starts it on cooldown", () => {
		const chips = combatStartChips(
			[
				effect("electrocute", "Electrocute"),
				effect("sheen-spellblade", "Sheen"),
			],
			["sheen-spellblade"],
		)

		expect(chips).toEqual([
			{ id: "electrocute", label: "Electrocute ready", ready: true },
			{ id: "sheen-spellblade", label: "Sheen ready", ready: false },
		])
	})
})
