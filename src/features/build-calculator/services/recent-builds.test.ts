import { describe, expect, test } from "bun:test"
import {
	MAX_RECENT_BUILDS,
	type RecentBuild,
	readRecentBuilds,
	recordRecentBuild,
} from "./recent-builds"

function memoryStorage() {
	const values = new Map<string, string>()
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value)
		},
		removeItem: (key: string) => {
			values.delete(key)
		},
	}
}

const blockedStorage = {
	getItem: (): string | null => {
		throw new DOMException("Blocked", "SecurityError")
	},
	setItem: () => {
		throw new DOMException("Blocked", "SecurityError")
	},
	removeItem: () => {
		throw new DOMException("Blocked", "SecurityError")
	},
}

function build(championKey: string, level = 1): RecentBuild {
	return { championKey, level, itemIds: [] }
}

function championKeys(builds: RecentBuild[]) {
	return builds.map(({ championKey }) => championKey)
}

describe("recent builds", () => {
	test("start empty", () => {
		expect(readRecentBuilds({ storage: memoryStorage() })).toEqual([])
	})

	test("keep the recorded build with its level, items and patch", () => {
		const storage = memoryStorage()
		const heimer: RecentBuild = {
			championKey: "Heimerdinger",
			level: 11,
			itemIds: ["3089", "3020"],
			patch: "16.19.1",
		}
		recordRecentBuild(heimer, { storage })
		expect(readRecentBuilds({ storage })).toEqual([heimer])
	})

	test("keep the rune page and hand it back as recorded", () => {
		const storage = memoryStorage()
		const runes = "8200-8229-8226-8210-8237_8300-8304-8347_5008-5008-5011"
		recordRecentBuild({ ...build("Ahri"), runes }, { storage })
		expect(readRecentBuilds({ storage })[0]?.runes).toBe(runes)
	})

	test("read builds stored before runes existed", () => {
		const storage = memoryStorage()
		const stored = [
			{ championKey: "Heimerdinger", level: 11, itemIds: ["3089"] },
		]
		storage.setItem("heimerbuild:recent-builds:v1", JSON.stringify(stored))
		expect(readRecentBuilds({ storage })).toEqual(stored)

		recordRecentBuild(build("Ahri"), { storage })
		expect(championKeys(readRecentBuilds({ storage }))).toEqual([
			"Ahri",
			"Heimerdinger",
		])
	})

	test("drop only the runes of a build whose stored rune page is invalid", () => {
		const storage = memoryStorage()
		storage.setItem(
			"heimerbuild:recent-builds:v1",
			JSON.stringify([
				{ championKey: "Ahri", level: 3, itemIds: [], runes: "<script>_x_y" },
			]),
		)
		expect(readRecentBuilds({ storage })).toEqual([build("Ahri", 3)])
	})

	test("keep the form, and drop only the form when the stored one is invalid", () => {
		const storage = memoryStorage()
		recordRecentBuild({ ...build("Gnar"), form: "mega" }, { storage })
		expect(readRecentBuilds({ storage })[0]?.form).toBe("mega")

		storage.setItem(
			"heimerbuild:recent-builds:v1",
			JSON.stringify([{ ...build("Gnar", 3), form: "<b>" }]),
		)
		expect(readRecentBuilds({ storage })).toEqual([build("Gnar", 3)])
	})

	test("keep the skill points, and drop only them when the stored ones are invalid", () => {
		const storage = memoryStorage()
		recordRecentBuild({ ...build("Teemo"), skills: "EQWE" }, { storage })
		expect(readRecentBuilds({ storage })[0]?.skills).toBe("EQWE")

		storage.setItem(
			"heimerbuild:recent-builds:v1",
			JSON.stringify([{ ...build("Teemo", 3), skills: "QX" }]),
		)
		expect(readRecentBuilds({ storage })).toEqual([build("Teemo", 3)])
	})

	test("list the newest first, one entry per champion", () => {
		const storage = memoryStorage()
		recordRecentBuild(build("Ahri"), { storage })
		recordRecentBuild(build("Garen"), { storage })
		recordRecentBuild(build("Ahri", 16), { storage })

		const builds = readRecentBuilds({ storage })
		expect(championKeys(builds)).toEqual(["Ahri", "Garen"])
		expect(builds[0]?.level).toBe(16)
	})

	test(`keep only the last ${MAX_RECENT_BUILDS}`, () => {
		const storage = memoryStorage()
		for (const key of ["A", "B", "C", "D", "E", "F"]) {
			recordRecentBuild(build(key), { storage })
		}
		expect(championKeys(readRecentBuilds({ storage }))).toEqual([
			"F",
			"E",
			"D",
			"C",
			"B",
		])
	})

	test("ignore stored data they cannot read", () => {
		const storage = memoryStorage()
		storage.setItem("heimerbuild:recent-builds:v1", "not json")
		expect(readRecentBuilds({ storage })).toEqual([])
		storage.setItem("heimerbuild:recent-builds:v1", '[{"championKey":"../x"}]')
		expect(readRecentBuilds({ storage })).toEqual([])

		recordRecentBuild(build("Ahri"), { storage })
		expect(championKeys(readRecentBuilds({ storage }))).toEqual(["Ahri"])
	})

	test("never throw when storage is blocked", () => {
		expect(() =>
			recordRecentBuild(build("Ahri"), { storage: blockedStorage }),
		).not.toThrow()
		expect(readRecentBuilds({ storage: blockedStorage })).toEqual([])
	})
})
