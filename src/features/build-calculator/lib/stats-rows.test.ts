import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type ComputedStats, computeStats } from "@/lib/stats/compute-stats"
import type { StatComposition } from "@/lib/stats/stat-composition"
import { type FormComparison, statDeltas } from "./diff-stats"
import { compareColumns, type StatsRow, statsRows } from "./stats-rows"

// Real current-patch data (public/data).
const DATA = new URL("../../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()
const gnar: Champion = championSchema.parse(
	await Bun.file(new URL(`${PATCH}/champions/Gnar.json`, DATA)).json(),
)

function noParts(stats: ComputedStats): StatComposition {
	return Object.fromEntries(
		Object.keys(stats).map((stat) => [stat, []]),
	) as unknown as StatComposition
}

/** Gnar's rows in `form`, compared with the other form when `compared` is set. */
function gnarRows(form: string, compared?: string): StatsRow[] {
	const stats = computeStats(gnar, 1, [], { form })
	const comparison: FormComparison | undefined = compared
		? {
				formName: form,
				comparedName: compared,
				comparedFirst: compared === "mini",
				deltas: statDeltas(
					stats,
					computeStats(gnar, 1, [], { form: compared }),
				),
			}
		: undefined
	return statsRows({
		stats,
		composition: noParts(stats),
		resource: gnar.resource,
		attackSpeedRatio: gnar.stats.attackSpeed.ratio,
		formComparison: comparison,
	}).flatMap(({ rows }) => rows)
}

function row(rows: StatsRow[], stat: string): StatsRow {
	const found = rows.find(({ info }) => info.stat === stat)
	if (!found) throw new Error(`no ${stat} row`)
	return found
}

describe("statsRows with the forms compared", () => {
	test("a stat that differs carries both forms' totals", () => {
		const health = row(gnarRows("mega", "mini"), "health")
		const mini = computeStats(gnar, 1, [], { form: "mini" }).health.total
		const mega = computeStats(gnar, 1, [], { form: "mega" }).health.total
		expect(health.total).toBe(mega)
		expect(health.comparedTotal).toBe(mini)
		expect(health.formDelta).toBe(mega - mini)
	})

	test("a stat that is equal in both forms still carries the other form's total", () => {
		const abilityPower = row(gnarRows("mega", "mini"), "abilityPower")
		expect(abilityPower.formDelta).toBeUndefined()
		expect(abilityPower.comparedTotal).toBe(abilityPower.total)
	})

	test("without a comparison no row carries another form's total", () => {
		const rows = gnarRows("mega")
		expect(rows.some((entry) => entry.comparedTotal !== undefined)).toBe(false)
	})
})

describe("compareColumns", () => {
	test("puts the forms in the champion's order and marks the selected one", () => {
		const columns = (comparedFirst: boolean, formName: string) =>
			compareColumns({
				formName,
				comparedName: formName === "Mega Gnar" ? "Mini Gnar" : "Mega Gnar",
				comparedFirst,
				deltas: {},
			})

		expect(columns(true, "Mega Gnar")).toEqual([
			{ name: "Mini Gnar", selected: false },
			{ name: "Mega Gnar", selected: true },
		])
		expect(columns(false, "Mini Gnar")).toEqual([
			{ name: "Mini Gnar", selected: true },
			{ name: "Mega Gnar", selected: false },
		])
	})
})
