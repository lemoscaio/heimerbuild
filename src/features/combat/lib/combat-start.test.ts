import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import {
	readCombatStart,
	startOptionLabel,
	toggleCombatStart,
} from "./combat-start"

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
			start,
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
		},
	}
}

describe("startOptionLabel", () => {
	test("names a mark on the target, or an effect ready", () => {
		expect(startOptionLabel(bound("Harrier", { kind: "marked" }))).toBe(
			"Target marked by Harrier",
		)
		expect(startOptionLabel(bound("Short Fuse", { kind: "running" }))).toBe(
			"Short Fuse ready",
		)
	})
})

describe("readCombatStart", () => {
	const options = [{ id: "harrier" }, { id: "short-fuse" }]

	test("keeps the choices the build supports, in the options' order", () => {
		expect(readCombatStart(["short-fuse", "gone", "harrier"], options)).toEqual(
			["harrier", "short-fuse"],
		)
	})

	test("keeps every choice while the options load", () => {
		expect(readCombatStart(["gone"], undefined)).toEqual(["gone"])
	})
})

describe("toggleCombatStart", () => {
	test("turns a choice on once, and off", () => {
		expect(toggleCombatStart(["harrier"], "harrier", true)).toEqual(["harrier"])
		expect(toggleCombatStart([], "harrier", true)).toEqual(["harrier"])
		expect(toggleCombatStart(["harrier"], "harrier", false)).toEqual([])
	})
})
