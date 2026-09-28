import { describe, expect, test } from "bun:test"
import { cn } from "./cn"

describe("cn", () => {
	test("keeps the last of two conflicting classes", () => {
		expect(cn("bg-primary-2 p-2", "bg-primary-1")).toBe("p-2 bg-primary-1")
	})

	test("keeps a palette text color next to a font size", () => {
		expect(cn("text-sm", "text-primary-1")).toBe("text-sm text-primary-1")
	})

	test("adds object keys only when their value is true", () => {
		expect(cn("flex", { "opacity-50": true, hidden: false })).toBe(
			"flex opacity-50",
		)
	})
})
