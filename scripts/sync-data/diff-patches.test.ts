import { describe, expect, test } from "bun:test"
import { diffPatches, type PatchData } from "./diff-patches"
import communityDragonBin from "./fixtures/cdragon-items.json"
import heimerdingerBin from "./fixtures/champions/Heimerdinger.bin.json"
import heimerdingerDetail from "./fixtures/champions/Heimerdinger.json"
import dataDragonItems from "./fixtures/ddragon-item.json"
import map11Bin from "./fixtures/map11.bin.json"
import { normalizeChampion } from "./normalize-champions"
import { normalizeItems } from "./normalize-items"

function basePatch(): PatchData {
	return {
		champions: [
			normalizeChampion(heimerdingerDetail, heimerdingerBin, "16.19.1"),
		],
		items: normalizeItems(dataDragonItems, communityDragonBin, map11Bin).file
			.items,
	}
}

function diff(change: (data: PatchData) => void): string {
	const next = structuredClone(basePatch())
	change(next)
	return diffPatches(
		{ patch: "16.19.1", data: basePatch() },
		{ patch: "16.20.1", data: next },
	)
}

describe("diffPatches", () => {
	test("reports no changes between identical patches", () => {
		const summary = diff(() => {})
		expect(summary).toContain("## Game data changes: 16.19.1 -> 16.20.1")
		expect(summary).toContain("### Champions: 1 -> 1")
		expect(summary).not.toContain("| Name |")
	})

	test("lists champion stat changes as before/after rows", () => {
		const summary = diff((data) => {
			const [heimerdinger] = data.champions
			if (heimerdinger) heimerdinger.stats.health.base = 570
		})
		expect(summary).toContain(
			"| Heimerdinger | stats.health.base | 558 | 570 |",
		)
	})

	test("lists added and removed items and item stat and gold changes", () => {
		const summary = diff((data) => {
			data.items = data.items.filter((item) => item.id !== "1042")
			const dirk = data.items.find((item) => item.id === "3134")
			if (dirk) {
				dirk.stats.lethality = 12
				dirk.gold.total = 1100
			}
			const copy = structuredClone(data.items[0])
			if (copy) data.items.push({ ...copy, id: "9999", name: "New Sword" })
		})
		expect(summary).toContain("- Added: New Sword (9999)")
		expect(summary).toContain("- Removed: Dagger (1042)")
		expect(summary).toContain(
			"| Serrated Dirk (3134) | stats.lethality | 10 | 12 |",
		)
		expect(summary).toContain("| Serrated Dirk (3134) | gold | 1000 | 1100 |")
	})

	test("shows a dash for a stat that appears or disappears", () => {
		const summary = diff((data) => {
			const sword = data.items.find((item) => item.id === "1036")
			if (sword) sword.stats.armor = 5
		})
		expect(summary).toContain("| Long Sword (1036) | stats.armor | - | 5 |")
	})
})
