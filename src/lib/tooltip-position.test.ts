import { describe, expect, test } from "bun:test"
import { tooltipPosition } from "./tooltip-position"

const viewport = { width: 400, height: 800 }
const tooltip = { width: 200, height: 100 }

describe("tooltipPosition", () => {
	test("centers the tooltip above the anchor when it fits", () => {
		const anchor = { top: 300, left: 180, width: 40, height: 40 }
		expect(tooltipPosition(anchor, tooltip, viewport)).toEqual({
			top: 194,
			left: 100,
		})
	})

	test("goes below the anchor when there is no room above", () => {
		const anchor = { top: 50, left: 180, width: 40, height: 40 }
		expect(tooltipPosition(anchor, tooltip, viewport).top).toBe(96)
	})

	test("stays inside the left and right edges", () => {
		const nearLeft = { top: 300, left: 0, width: 40, height: 40 }
		const nearRight = { top: 300, left: 370, width: 40, height: 40 }
		expect(tooltipPosition(nearLeft, tooltip, viewport).left).toBe(8)
		expect(tooltipPosition(nearRight, tooltip, viewport).left).toBe(192)
	})

	test("stays inside the viewport when it fits neither above nor below", () => {
		const anchor = { top: 60, left: 180, width: 40, height: 700 }
		expect(tooltipPosition(anchor, tooltip, viewport).top).toBe(692)
	})
})
