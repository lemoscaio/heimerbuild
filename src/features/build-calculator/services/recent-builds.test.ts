import { describe, expect, test } from "bun:test"
import { BUILD_LINK_VERSION } from "../lib/build-link-migrations"
import {
	MAX_RECENT_BUILDS,
	RECENT_BUILDS_KEY,
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

	test("store each build as its link, in the current link version", () => {
		const storage = memoryStorage()
		recordRecentBuild(
			{
				championKey: "Gnar",
				level: 11,
				itemIds: ["1036"],
				form: "mega",
				summoners: "14,4",
			},
			{ storage },
		)
		expect(JSON.parse(storage.getItem(RECENT_BUILDS_KEY) ?? "")).toEqual([
			{
				championKey: "Gnar",
				search: {
					v: BUILD_LINK_VERSION,
					lvl: 11,
					items: ["1036"],
					form: "mega",
					summoners: "14,4",
				},
			},
		])
	})

	test("read a stored link like any link: no version is v1, and a bad value only loses that value", () => {
		const storage = memoryStorage()
		storage.setItem(
			RECENT_BUILDS_KEY,
			JSON.stringify([
				{
					championKey: "Heimerdinger",
					search: { lvl: 6, items: "3089,3020", skills: "EQWQ", form: "<b>" },
				},
			]),
		)
		expect(readRecentBuilds({ storage })).toEqual([
			{
				championKey: "Heimerdinger",
				level: 6,
				itemIds: ["3089", "3020"],
				skills: "EQWQ",
			},
		])
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

	test("keep the summoner spells, and drop only them when the stored ones are invalid", () => {
		const storage = memoryStorage()
		recordRecentBuild({ ...build("Teemo"), summoners: "4,14" }, { storage })
		expect(readRecentBuilds({ storage })[0]?.summoners).toBe("4,14")

		storage.setItem(
			"heimerbuild:recent-builds:v1",
			JSON.stringify([{ ...build("Teemo", 3), summoners: "flash" }]),
		)
		expect(readRecentBuilds({ storage })).toEqual([build("Teemo", 3)])
	})

	test("keep the effect choices, and drop only them when the stored ones are invalid", () => {
		const storage = memoryStorage()
		const effects = { ghost: true, "teemo-w-passive": false }
		recordRecentBuild({ ...build("Teemo"), effects }, { storage })
		expect(readRecentBuilds({ storage })[0]?.effects).toEqual(effects)

		storage.setItem(
			"heimerbuild:recent-builds:v1",
			JSON.stringify([
				{ championKey: "Teemo", search: { lvl: 3, effects: "Ghost!" } },
			]),
		)
		expect(readRecentBuilds({ storage })).toEqual([build("Teemo", 3)])
	})

	test("keep the current health", () => {
		const storage = memoryStorage()
		recordRecentBuild(
			{ ...build("Tryndamere"), currentHealth: 40 },
			{ storage },
		)
		expect(readRecentBuilds({ storage })[0]?.currentHealth).toBe(40)
	})

	test("keep the game time", () => {
		const storage = memoryStorage()
		recordRecentBuild({ ...build("Ahri"), gameTime: 30 }, { storage })
		expect(readRecentBuilds({ storage })[0]?.gameTime).toBe(30)
	})

	test("store full health and the game's start as no value, like the link", () => {
		const storage = memoryStorage()
		recordRecentBuild(
			{ ...build("Tryndamere"), currentHealth: 100, gameTime: 0 },
			{ storage },
		)
		const stored = storage.getItem(RECENT_BUILDS_KEY) ?? ""
		expect(stored).not.toContain('"hp"')
		expect(stored).not.toContain('"min"')
		expect(readRecentBuilds({ storage })).toEqual([build("Tryndamere")])
	})

	test("keep the combo, its free mode and choices, and its target", () => {
		const storage = memoryStorage()
		const combo = {
			combo: "aa.q-handle.t1_5",
			free: true,
			choices: "1e-hail-of-blades-n",
			target: "tank",
		}
		recordRecentBuild({ ...build("Darius"), ...combo }, { storage })
		expect(readRecentBuilds({ storage })).toEqual([
			{ ...build("Darius"), ...combo },
		])
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
