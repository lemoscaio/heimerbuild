import { describe, expect, test } from "bun:test"
import { isSearchShortcut } from "./is-search-shortcut"

const body = { tagName: "BODY", isContentEditable: false }
const slash = {
	key: "/",
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	defaultPrevented: false,
	target: body,
}

describe("isSearchShortcut", () => {
	test("a slash on the page or on a button", () => {
		expect(isSearchShortcut(slash)).toBe(true)
		expect(
			isSearchShortcut({
				...slash,
				target: { tagName: "BUTTON", isContentEditable: false },
			}),
		).toBe(true)
		expect(isSearchShortcut({ ...slash, target: null })).toBe(true)
	})

	test.each(["INPUT", "TEXTAREA", "SELECT"])(
		"not while typing in a %s",
		(tagName) => {
			expect(
				isSearchShortcut({
					...slash,
					target: { tagName, isContentEditable: false },
				}),
			).toBe(false)
		},
	)

	test("not while typing in editable content", () => {
		expect(
			isSearchShortcut({
				...slash,
				target: { tagName: "DIV", isContentEditable: true },
			}),
		).toBe(false)
	})

	test.each(["altKey", "ctrlKey", "metaKey"] as const)(
		"not with %s held",
		(modifier) => {
			expect(isSearchShortcut({ ...slash, [modifier]: true })).toBe(false)
		},
	)

	test("not for other keys or an already handled event", () => {
		expect(isSearchShortcut({ ...slash, key: "?" })).toBe(false)
		expect(isSearchShortcut({ ...slash, defaultPrevented: true })).toBe(false)
	})
})
