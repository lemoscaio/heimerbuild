import { describe, expect, test } from "bun:test"
import { formatStat } from "./stats-info"

describe("formatStat", () => {
	test.each([
		{
			case: "flat, up to 2 decimals",
			value: 7.456,
			format: "flat",
			shown: "7.46",
		},
		{ case: "flat, whole", value: 558, format: "flat", shown: "558" },
		{ case: "percent fraction", value: 0.25, format: "percent", shown: "25%" },
		{
			case: "percent, one decimal",
			value: 0.025,
			format: "percent",
			shown: "2.5%",
		},
		{
			case: "attack speed, attacks per second without %",
			value: 0.658,
			format: "attackSpeed",
			shown: "0.658",
		},
	] as const)("$case", ({ value, format, shown }) => {
		expect(formatStat(value, format)).toBe(shown)
	})
})
