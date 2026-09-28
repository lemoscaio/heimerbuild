import { describe, expect, test } from "bun:test"
import { moveRovingIndex } from "./move-roving-index"

// 10 items in rows of 4:  0 1 2 3 / 4 5 6 7 / 8 9
const grid = { count: 10, columns: 4 }

describe("moveRovingIndex", () => {
	test("left and right move by one item and stop at the ends", () => {
		expect(moveRovingIndex(5, "ArrowRight", grid)).toBe(6)
		expect(moveRovingIndex(5, "ArrowLeft", grid)).toBe(4)
		expect(moveRovingIndex(0, "ArrowLeft", grid)).toBe(0)
		expect(moveRovingIndex(9, "ArrowRight", grid)).toBe(9)
	})

	test("right wraps from the end of a row to the start of the next", () => {
		expect(moveRovingIndex(3, "ArrowRight", grid)).toBe(4)
	})

	test("up and down move by one row", () => {
		expect(moveRovingIndex(5, "ArrowDown", grid)).toBe(9)
		expect(moveRovingIndex(5, "ArrowUp", grid)).toBe(1)
	})

	test("up stays put in the first row and down in the last row", () => {
		expect(moveRovingIndex(2, "ArrowUp", grid)).toBe(2)
		expect(moveRovingIndex(8, "ArrowDown", grid)).toBe(8)
	})

	test("down above a gap in a shorter last row moves to the last item", () => {
		expect(moveRovingIndex(7, "ArrowDown", grid)).toBe(9)
	})

	test("home and end move to the first and last item", () => {
		expect(moveRovingIndex(6, "Home", grid)).toBe(0)
		expect(moveRovingIndex(6, "End", grid)).toBe(9)
	})

	test("a single column moves up and down one item at a time", () => {
		const column = { count: 3, columns: 1 }
		expect(moveRovingIndex(1, "ArrowDown", column)).toBe(2)
		expect(moveRovingIndex(1, "ArrowUp", column)).toBe(0)
	})

	test("ignores keys the grid does not handle", () => {
		expect(moveRovingIndex(5, "Enter", grid)).toBeUndefined()
		expect(moveRovingIndex(5, "a", grid)).toBeUndefined()
	})
})
