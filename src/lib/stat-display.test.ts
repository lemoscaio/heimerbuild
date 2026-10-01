import { describe, expect, test } from "bun:test"
import { resourceDisplay, statDisplay } from "./stat-display"

describe("resourceDisplay", () => {
	test.each([
		["MANA", "Mana"],
		["ENERGY", "Energy"],
		["FURY", "Fury"],
		["FRENZY", "Frenzy"],
		["BLOOD_WELL", "Blood Well"],
		["CRIMSON_RUSH", "Crimson Rush"],
	])("%s is %s", (resource, label) => {
		expect(resourceDisplay(resource).label).toBe(label)
	})

	test("mana keeps the mana stat icon", () => {
		expect(resourceDisplay("MANA").icon).toBe(statDisplay.mana.icon)
	})

	test("a resource from a later patch reads as words with a neutral icon", () => {
		const later = resourceDisplay("SOUL_FLAME")
		expect(later.label).toBe("Soul Flame")
		expect(later.icon).not.toBe(statDisplay.mana.icon)
	})

	test("every resource of the current patch has an icon of its own", async () => {
		const { currentPatch } = await Bun.file(
			new URL("../../public/data/manifest.json", import.meta.url),
		).json()
		const championsDir = new URL(
			`../../public/data/${currentPatch}/champions/`,
			import.meta.url,
		).pathname
		const resources = new Set<string>()
		for await (const file of new Bun.Glob("*.json").scan(championsDir)) {
			const { resource } = await Bun.file(`${championsDir}${file}`).json()
			if (resource !== "NONE") resources.add(resource)
		}
		const icons = [...resources].map(
			(resource) => resourceDisplay(resource).icon,
		)

		expect(resources.size).toBeGreaterThan(1)
		expect(new Set(icons).size).toBe(resources.size)
		expect(icons).not.toContain(resourceDisplay("SOUL_FLAME").icon)
	})
})
