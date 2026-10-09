import { describe, expect, test } from "bun:test"
import { rowBar, sourceTotals } from "./source-summary"

describe("sourceTotals", () => {
	test("sums parts by kind in legend order, previewed parts on their own, and drops kinds that add nothing", () => {
		expect(
			sourceTotals([
				{ id: "p1", kind: "item", label: "Kraken Slayer", value: 0.25 },
				{ id: "p2", kind: "base", label: "Base", value: 0.625 },
				{ id: "p3", kind: "item", label: "Runaan's", value: 0.25 },
				{
					id: "p4",
					kind: "item",
					label: "Phantom Dancer",
					value: 0.4,
					preview: true,
				},
				{ id: "p5", kind: "effect", label: "A", value: 0.1 },
				{ id: "p6", kind: "effect", label: "B", value: -0.1 },
			]),
		).toEqual([
			{ kind: "base", value: 0.625 },
			{ kind: "item", value: 0.5 },
			{ kind: "preview", value: 0.4 },
		])
	})
})

describe("rowBar", () => {
	test("places positive kinds end to end and marks what negative ones take back", () => {
		const bar = rowBar([
			{ kind: "base", value: 300 },
			{ kind: "item", value: 100 },
			{ kind: "form", value: -100 },
		])

		expect(bar.segments).toEqual([
			{ kind: "base", start: 0, width: 0.75 },
			{ kind: "item", start: 0.75, width: 0.25 },
		])
		expect(bar.lost).toEqual({ start: 0.75, width: 0.25 })
	})

	test("grows to reach a marked total above the sources", () => {
		const bar = rowBar([{ kind: "base", value: 50 }], { marker: 100 })

		expect(bar.segments).toEqual([{ kind: "base", start: 0, width: 0.5 }])
		expect(bar.markerAt).toBe(1)
	})
})
