import { describe, expect, test } from "bun:test"
import {
	type BuildLinkMigrations,
	migrateBuildLink,
	readBuildLinkVersion,
} from "./build-link-migrations"

// Fake history: v1 → v2 renames `lvl` to `level`, v2 → v3 doubles it.
const fakeMigrations: BuildLinkMigrations = [
	({ lvl, ...search }) => ({ ...search, level: lvl }),
	({ level, ...search }) => ({
		...search,
		level: typeof level === "number" ? level * 2 : level,
	}),
]

describe("readBuildLinkVersion", () => {
	test("reads a link without a version as v1", () => {
		expect(readBuildLinkVersion({ lvl: 9 })).toBe(1)
	})

	test("reads the link's version", () => {
		expect(readBuildLinkVersion({ v: 1 })).toBe(1)
		expect(readBuildLinkVersion({ v: 2 })).toBe(2)
	})

	test("reads a version that is not a positive whole number as v1", () => {
		expect(readBuildLinkVersion({ v: 0 })).toBe(1)
		expect(readBuildLinkVersion({ v: 1.5 })).toBe(1)
		expect(readBuildLinkVersion({ v: "abc" })).toBe(1)
	})
})

describe("migrateBuildLink", () => {
	test("applies every migration from a v1 link on, in order", () => {
		expect(migrateBuildLink({ lvl: 9, items: "3089" }, fakeMigrations)).toEqual(
			{ level: 18, items: "3089", v: 3 },
		)
	})

	test("treats a link without a version as v1", () => {
		expect(migrateBuildLink({ lvl: 9 }, fakeMigrations)).toEqual({
			level: 18,
			v: 3,
		})
	})

	test("applies only the migrations after the link's version", () => {
		expect(migrateBuildLink({ level: 9, v: 2 }, fakeMigrations)).toEqual({
			level: 18,
			v: 3,
		})
	})

	test("leaves a latest-version link as it is", () => {
		expect(migrateBuildLink({ level: 9, v: 3 }, fakeMigrations)).toEqual({
			level: 9,
			v: 3,
		})
	})

	test("marks a link of the first version, with no migrations yet, as v1", () => {
		expect(migrateBuildLink({ lvl: 9 }, [])).toEqual({ lvl: 9, v: 1 })
	})
})
