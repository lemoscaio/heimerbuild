import { describe, expect, test } from "bun:test"
import { splitNumbers } from "./split-numbers"

function numbers(text: string) {
	return splitNumbers(text)
		.filter((part) => part.isNumber)
		.map((part) => part.text)
}

describe("splitNumbers", () => {
	test("keeps every character, in order", () => {
		const text = "Gain 0.45% Life Steal for every stack (max 15 stacks)."
		expect(
			splitNumbers(text)
				.map((part) => part.text)
				.join(""),
		).toBe(text)
	})

	test.each([
		{ text: "Gain 0.45% Life Steal (max 15 stacks)", found: ["0.45%", "15"] },
		{ text: "Damage: 70 - 240 (+0.1 bonus AD)", found: ["70 - 240", "+0.1"] },
		{ text: "gaining 1.8-4 Adaptive Force", found: ["1.8-4"] },
		{ text: "+9 Adaptive Force", found: ["+9"] },
		{ text: "Cooldown: 20s - 10s", found: ["20", "10"] },
		{ text: "[6% Melee || 4% Ranged]", found: ["6%", "4%"] },
	])("finds the numbers in $text", ({ text, found }) => {
		expect(numbers(text)).toEqual([...found])
	})

	test("returns plain text as one part", () => {
		expect(splitNumbers("No numbers here")).toEqual([
			{ text: "No numbers here", isNumber: false },
		])
	})
})
