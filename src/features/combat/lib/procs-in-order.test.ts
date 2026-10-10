import { describe, expect, test } from "bun:test"
import { procsInOrder } from "./procs-in-order"

type Item = { name: string; time?: number; procs: { time: number }[] }

const order = (items: Item[]) =>
	procsInOrder(items, {
		timeOf: ({ time }) => time,
		procsOf: ({ procs }) => procs,
	}).map((entry) =>
		entry.kind === "item"
			? entry.item.name
			: `${entry.owner.name}@${entry.proc.time}`,
	)

describe("procsInOrder", () => {
	test("Arcane Comet at 0.80 s follows the attack started at 0.50 s, after Q that triggered it", () => {
		expect(
			order([
				{ name: "Q", time: 0, procs: [{ time: 0.8 }] },
				{ name: "W", time: 0.25, procs: [] },
				{ name: "AA", time: 0.5, procs: [] },
			]),
		).toEqual(["Q", "W", "AA", "Q@0.8"])
	})

	test("an Aery from Q at 0.45 s comes before the attack starting at 0.50 s", () => {
		expect(
			order([
				{ name: "Q", time: 0, procs: [{ time: 0.45 }] },
				{ name: "W", time: 0.25, procs: [] },
				{ name: "AA", time: 0.5, procs: [{ time: 0.8 }] },
			]),
		).toEqual(["Q", "W", "Q@0.45", "AA", "AA@0.8"])
	})

	test("a marker, with no time, never moves a proc past it", () => {
		expect(
			order([
				{ name: "Q", time: 0, procs: [{ time: 0.8 }] },
				{ name: "marker", procs: [] },
				{ name: "AA", time: 1, procs: [] },
			]),
		).toEqual(["Q", "marker", "Q@0.8", "AA"])
	})
})
