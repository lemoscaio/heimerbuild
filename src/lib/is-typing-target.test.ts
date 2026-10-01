import { expect, test } from "bun:test"
import { isTypingTarget } from "./is-typing-target"

test.each(["INPUT", "TEXTAREA", "SELECT"])(
	"a %s is a typing target",
	(tagName) => {
		expect(isTypingTarget({ tagName, isContentEditable: false })).toBe(true)
	},
)

test("editable content is a typing target, with its children", () => {
	expect(isTypingTarget({ tagName: "SPAN", isContentEditable: true })).toBe(
		true,
	)
})

test("the page, a button or no target are not", () => {
	expect(isTypingTarget({ tagName: "BODY", isContentEditable: false })).toBe(
		false,
	)
	expect(isTypingTarget({ tagName: "BUTTON", isContentEditable: false })).toBe(
		false,
	)
	expect(isTypingTarget(null)).toBe(false)
})
