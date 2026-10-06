import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { combatSituations, situationLabel } from "./combat-situations"

function bound(name: string, start: Effect["start"]): BuildEffect {
	return {
		id: name.toLowerCase().replace(/ /g, "-"),
		name,
		icon: "",
		effect: {
			id: name,
			source: { kind: "ability", championKey: "Test", slot: "passive" },
			trigger: { kind: "periodic" },
			grants: [],
			...(start && { start }),
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
		},
	}
}

describe("situationLabel", () => {
	test("names a mark on the target, or an effect ready", () => {
		expect(situationLabel(bound("Harrier", { kind: "marked" }))).toBe(
			"Target marked by Harrier",
		)
		expect(situationLabel(bound("Short Fuse", { kind: "running" }))).toBe(
			"Short Fuse ready",
		)
		expect(situationLabel(bound("Hail of Blades", { kind: "ready" }))).toBe(
			"Hail of Blades ready",
		)
	})
})

describe("combatSituations", () => {
	test("offers the effects that declare a situation, in order", () => {
		const effects = [
			bound("Harrier", { kind: "marked" }),
			bound("Ignite", undefined),
			bound("Hail of Blades", { kind: "ready" }),
		]

		expect(combatSituations(effects)).toEqual([
			{ id: "harrier", label: "Target marked by Harrier", kind: "marked" },
			{ id: "hail-of-blades", label: "Hail of Blades ready", kind: "ready" },
		])
	})
})
