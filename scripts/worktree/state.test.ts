import { describe, expect, test } from "bun:test"
import {
	assignPort,
	claudeWorktreeFile,
	parseState,
	parseWorktreeList,
	pruneState,
	worktreeName,
	worktreePath,
} from "./state"

const PORCELAIN = `worktree /dev/heimerbuild
HEAD 36f786a67dfaad9de59f68469c0916e11d070a43
branch refs/heads/main

worktree /dev/heimerbuild-claude-stack-b
HEAD b0016210000000000000000000000000000000000
branch refs/heads/chore/wt-script

worktree /dev/other-folder
HEAD 074a76e000000000000000000000000000000000
detached
`

describe("worktreeName", () => {
	test("prefixes claude- only for Claude and only once", () => {
		expect(worktreeName("item-tooltip")).toBe("item-tooltip")
		expect(worktreeName("item-tooltip", { claude: true })).toBe(
			"claude-item-tooltip",
		)
		expect(worktreeName("claude-item-tooltip", { claude: true })).toBe(
			"claude-item-tooltip",
		)
	})

	test("rejects names that are not kebab-case", () => {
		expect(() => worktreeName("Item Tooltip")).toThrow("Invalid worktree name")
		expect(() => worktreeName("../escape")).toThrow("Invalid worktree name")
	})
})

describe("worktreePath", () => {
	test("puts worktrees next to the main checkout", () => {
		expect(worktreePath("/dev/heimerbuild", "claude-x")).toBe(
			"/dev/heimerbuild-claude-x",
		)
	})
})

describe("parseWorktreeList", () => {
	test("names the main checkout main and strips the folder prefix", () => {
		expect(parseWorktreeList(PORCELAIN)).toEqual([
			{ name: "main", path: "/dev/heimerbuild", branch: "main", isMain: true },
			{
				name: "claude-stack-b",
				path: "/dev/heimerbuild-claude-stack-b",
				branch: "chore/wt-script",
				isMain: false,
			},
			{
				name: "other-folder",
				path: "/dev/other-folder",
				branch: undefined,
				isMain: false,
			},
		])
	})
})

describe("assignPort", () => {
	const never = () => false

	test("keeps 5173 for the main checkout", () => {
		expect(
			assignPort(parseState(undefined), { path: "/m", isMain: true }, never),
		).toBe(5173)
	})

	test("reuses the stored port so it stays stable", () => {
		const state = { worktrees: { "/a": { port: 5180 } } }
		expect(assignPort(state, { path: "/a", isMain: false }, () => true)).toBe(
			5180,
		)
	})

	test("takes the lowest port no worktree holds and nothing listens on", () => {
		const state = {
			worktrees: { "/a": { port: 5174 }, "/b": { port: 5176 } },
		}
		expect(assignPort(state, { path: "/c", isMain: false }, never)).toBe(5175)
		expect(
			assignPort(state, { path: "/c", isMain: false }, (port) => port === 5175),
		).toBe(5177)
	})
})

describe("pruneState", () => {
	test("drops entries for worktrees git no longer lists", () => {
		const state = {
			worktrees: {
				"/dev/heimerbuild-claude-stack-b": { port: 5174, pid: 1 },
				"/dev/heimerbuild-gone": { port: 5175 },
			},
		}
		expect(pruneState(state, parseWorktreeList(PORCELAIN))).toEqual({
			worktrees: { "/dev/heimerbuild-claude-stack-b": { port: 5174, pid: 1 } },
		})
	})
})

describe("claudeWorktreeFile", () => {
	test("writes created date, branch and purpose", () => {
		expect(
			claudeWorktreeFile({
				created: new Date(2026, 8, 28, 12),
				branch: "chore/wt-script",
				purpose: "try the wt script",
			}),
		).toBe(
			"created: 2026-09-28\nbranch: chore/wt-script\npurpose: try the wt script\n",
		)
	})
})
