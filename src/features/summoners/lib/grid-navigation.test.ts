import { describe, expect, test } from "bun:test"
import { moveInGrid } from "./grid-navigation"

// Nine spells in three columns:
// 0 1 2
// 3 4 5
// 6 7 8
const GRID = { columns: 3, count: 9 }

describe("moveInGrid", () => {
	test("moves one option sideways and one row up or down", () => {
		expect(moveInGrid(4, "ArrowRight", GRID)).toBe(5)
		expect(moveInGrid(4, "ArrowLeft", GRID)).toBe(3)
		expect(moveInGrid(4, "ArrowDown", GRID)).toBe(7)
		expect(moveInGrid(4, "ArrowUp", GRID)).toBe(1)
	})

	test("continues on the next row from a row's end", () => {
		expect(moveInGrid(2, "ArrowRight", GRID)).toBe(3)
		expect(moveInGrid(3, "ArrowLeft", GRID)).toBe(2)
	})

	test("stays put at the grid's edges", () => {
		expect(moveInGrid(0, "ArrowLeft", GRID)).toBe(0)
		expect(moveInGrid(1, "ArrowUp", GRID)).toBe(1)
		expect(moveInGrid(8, "ArrowRight", GRID)).toBe(8)
		expect(moveInGrid(7, "ArrowDown", GRID)).toBe(7)
	})

	test("stays put below a short last row", () => {
		expect(moveInGrid(5, "ArrowDown", { columns: 3, count: 7 })).toBe(5)
	})

	test("jumps to the first and the last option", () => {
		expect(moveInGrid(4, "Home", GRID)).toBe(0)
		expect(moveInGrid(4, "End", GRID)).toBe(8)
	})

	test("ignores other keys", () => {
		expect(moveInGrid(4, "Enter", GRID)).toBeUndefined()
		expect(moveInGrid(4, "a", GRID)).toBeUndefined()
	})
})
