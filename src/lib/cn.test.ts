import { describe, expect, test } from "bun:test"
import { cn } from "./cn"

describe("cn", () => {
	test("keeps the last of two conflicting classes", () => {
		expect(cn("bg-line p-2", "bg-line-strong")).toBe("p-2 bg-line-strong")
	})

	test("keeps a palette text color next to a font size", () => {
		expect(cn("text-sm", "text-line-strong")).toBe("text-sm text-line-strong")
	})

	test("adds object keys only when their value is true", () => {
		expect(cn("flex", { "opacity-50": true, hidden: false })).toBe(
			"flex opacity-50",
		)
	})
})
