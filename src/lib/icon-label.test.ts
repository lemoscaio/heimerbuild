import { describe, expect, test } from "bun:test"
import { iconLabel } from "./icon-label"

describe("iconLabel", () => {
	test("keeps a name that wraps into the tile", () => {
		expect(iconLabel("Long Sword")).toBe("Long Sword")
		expect(iconLabel("Heimerdinger")).toBe("Heimerdinger")
	})

	test("keeps a long name that still wraps into four lines", () => {
		expect(iconLabel("Locket of the Iron Solari")).toBe(
			"Locket of the Iron Solari",
		)
		expect(iconLabel("Blade of The Ruined King")).toBe(
			"Blade of The Ruined King",
		)
	})

	test("falls back to initials when the name needs more lines than the tile has", () => {
		expect(iconLabel("Unreasonably Extraordinary Legendary Item")).toBe("UELI")
		expect(iconLabel("Jak'Sho The Protean Of The Endless Void")).toBe("JTPOT")
	})

	test("takes each word's first letter or digit, skipping punctuation", () => {
		expect(iconLabel("Blade 'Of' Extraordinarily Ruined Kings")).toBe("BOERK")
	})
})
