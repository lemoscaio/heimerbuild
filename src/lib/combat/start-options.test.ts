import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "../effects/effect"
import { combatStartOptions } from "./start-options"

function bound(fields: Partial<Effect> & Pick<Effect, "id">): BuildEffect {
	return {
		id: fields.id,
		name: fields.id,
		icon: "icon.png",
		effect: {
			source: { kind: "ability", championKey: "Test", slot: "passive" },
			trigger: { kind: "periodic" },
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
			...fields,
		},
	}
}

describe("combatStartOptions", () => {
	const mark = bound({ id: "mark", start: { kind: "marked" } })
	const ready = bound({ id: "ready", start: { kind: "running" } })
	const plain = bound({ id: "plain" })
	const dragonOnly = bound({
		id: "dragon-only",
		start: { kind: "running" },
		form: "dragon",
	})

	test("offers only the build's effects that declare a starting situation", () => {
		expect(
			combatStartOptions([mark, plain, ready], undefined).map(({ id }) => id),
		).toEqual(["mark", "ready"])
	})

	test("leaves out one bound to another form", () => {
		expect(combatStartOptions([dragonOnly], undefined)).toEqual([])
		expect(combatStartOptions([dragonOnly], "dragon")).toEqual([dragonOnly])
	})
})
