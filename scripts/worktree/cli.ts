import { spawn, spawnSync } from "node:child_process"
import { existsSync, openSync, readFileSync } from "node:fs"
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { parseArgs } from "node:util"
import {
	assignPort,
	claudeWorktreeFile,
	MAIN_PORT,
	parseState,
	parseWorktreeList,
	pruneState,
	type Worktree,
	type WtState,
	worktreeName,
	worktreePath,
} from "./state"

const STATE_FILE = join(homedir(), ".heimerbuild-wt.json")
const START_TIMEOUT_MS = 20_000

const USAGE = `Usage: scripts/wt <command> [options]

  create <name> --branch <branch> [--deps] [--purpose <text>]
                      New worktree ../heimerbuild-<name> on a new branch from origin/main
  start [name]        Run the dev server in the background on the worktree's port
  stop [name]         Stop that dev server
  status              List worktrees with branch, port, URL and state
  destroy <name> [--force]
                      Stop, remove the worktree and delete its branch once merged

[name] defaults to the worktree you are in ("main" is the main checkout).`

function git(args: string[], cwd?: string): string {
	const result = spawnSync("git", args, { cwd, encoding: "utf8" })
	if (result.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed:\n${result.stderr.trim()}`)
	}
	return result.stdout.trim()
}

function listWorktrees(): Worktree[] {
	return parseWorktreeList(git(["worktree", "list", "--porcelain"]))
}

async function readState(): Promise<WtState> {
	return parseState(
		existsSync(STATE_FILE) ? await readFile(STATE_FILE, "utf8") : undefined,
	)
}

async function writeState(state: WtState): Promise<void> {
	await writeFile(STATE_FILE, `${JSON.stringify(state, null, "\t")}\n`)
}

function isPortBusy(port: number): boolean {
	const result = spawnSync(
		"lsof",
		["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
		{ encoding: "utf8" },
	)
	return result.stdout.trim().length > 0
}

function isAlive(pid: number | undefined): pid is number {
	if (!pid) return false
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

function findWorktree(worktrees: Worktree[], name?: string): Worktree {
	if (name) {
		const found = worktrees.find((worktree) => worktree.name === name)
		if (!found) throw new Error(`No worktree named "${name}" (see wt status)`)
		return found
	}
	const top = git(["rev-parse", "--show-toplevel"])
	const current = worktrees.find((worktree) => worktree.path === top)
	if (!current) throw new Error(`${top} is not a worktree of this repository`)
	return current
}

async function create(
	rawName: string | undefined,
	options: { branch?: string; deps?: boolean; purpose?: string },
): Promise<void> {
	if (!rawName || !options.branch) {
		throw new Error("create needs <name> and --branch <branch>")
	}
	const claude = process.env.CLAUDECODE === "1"
	const name = worktreeName(rawName, { claude })
	const [main] = listWorktrees()
	if (!main) throw new Error("git worktree list returned nothing")
	const path = worktreePath(main.path, name)

	git(["fetch", "origin", "main"], main.path)
	git(["worktree", "add", path, "-b", options.branch, "origin/main"], main.path)
	console.log(`Created ${path} on ${options.branch}`)

	if (claude) {
		const exclude = join(
			git(["rev-parse", "--path-format=absolute", "--git-common-dir"]),
			"info/exclude",
		)
		const excluded = existsSync(exclude)
			? readFileSync(exclude, "utf8").split("\n").includes(".claude-worktree")
			: false
		if (!excluded) {
			await mkdir(dirname(exclude), { recursive: true })
			await appendFile(exclude, "\n.claude-worktree\n")
		}
		await writeFile(
			join(path, ".claude-worktree"),
			claudeWorktreeFile({
				created: new Date(),
				branch: options.branch,
				purpose: options.purpose ?? "(not given)",
			}),
		)
	}

	if (options.deps) {
		const install = spawnSync("bun", ["install"], {
			cwd: path,
			stdio: "inherit",
		})
		if (install.status !== 0) throw new Error("bun install failed")
	}
}

async function waitForPort(port: number, pid: number): Promise<boolean> {
	const deadline = Date.now() + START_TIMEOUT_MS
	while (Date.now() < deadline) {
		if (!isAlive(pid)) return false
		if (isPortBusy(port)) return true
		await Bun.sleep(250)
	}
	return false
}

async function start(name?: string): Promise<void> {
	const worktrees = listWorktrees()
	const worktree = findWorktree(worktrees, name)
	const state = pruneState(await readState(), worktrees)
	const entry = state.worktrees[worktree.path]
	const port = assignPort(state, worktree, isPortBusy)
	const url = `http://localhost:${port}/`

	if (isAlive(entry?.pid)) {
		console.log(`${worktree.name} is already running at ${url}`)
		return
	}
	if (isPortBusy(port)) {
		throw new Error(
			`Port ${port} (assigned to ${worktree.name}) is used by another process`,
		)
	}
	if (!existsSync(join(worktree.path, "node_modules"))) {
		throw new Error(`${worktree.path} has no node_modules; run bun install`)
	}

	const logDir = join(worktree.path, ".wt")
	await mkdir(logDir, { recursive: true })
	const log = openSync(join(logDir, "dev.log"), "w")
	const child = spawn(
		"bun",
		["run", "dev", "--port", String(port), "--strictPort"],
		{ cwd: worktree.path, detached: true, stdio: ["ignore", log, log] },
	)
	child.unref()
	if (!child.pid) throw new Error("Could not start bun run dev")

	state.worktrees[worktree.path] = { port, pid: child.pid }
	await writeState(state)

	if (await waitForPort(port, child.pid)) {
		console.log(`${worktree.name} running at ${url} (log: .wt/dev.log)`)
		return
	}
	throw new Error(
		`${worktree.name} did not start on port ${port}; see ${join(logDir, "dev.log")}`,
	)
}

async function stop(name?: string): Promise<void> {
	const worktrees = listWorktrees()
	const worktree = findWorktree(worktrees, name)
	const state = pruneState(await readState(), worktrees)
	const entry = state.worktrees[worktree.path]
	if (isAlive(entry?.pid)) {
		// Detached, so the pid leads its own process group (bun + vite).
		process.kill(-entry.pid, "SIGTERM")
		console.log(`Stopped ${worktree.name}`)
	} else {
		console.log(`${worktree.name} is not running`)
	}
	if (entry) {
		state.worktrees[worktree.path] = { port: entry.port }
		await writeState(state)
	}
}

async function status(): Promise<void> {
	const worktrees = listWorktrees()
	const state = pruneState(await readState(), worktrees)
	const rows = worktrees.map((worktree) => {
		const entry = state.worktrees[worktree.path]
		const port = worktree.isMain ? MAIN_PORT : entry?.port
		const label = isAlive(entry?.pid)
			? "running"
			: port && isPortBusy(port)
				? "port in use"
				: "stopped"
		return [
			worktree.name,
			worktree.branch ?? "(detached)",
			port ? String(port) : "-",
			port ? `http://localhost:${port}/` : "-",
			label,
		]
	})
	const header = ["NAME", "BRANCH", "PORT", "URL", "STATE"]
	const widths = header.map((title, column) =>
		Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)),
	)
	for (const row of [header, ...rows]) {
		console.log(
			row
				.map((value, column) => value.padEnd(widths[column] ?? 0))
				.join("  ")
				.trimEnd(),
		)
	}
}

function isMerged(branch: string, cwd: string): boolean {
	const pr = spawnSync(
		"gh",
		[
			"pr",
			"list",
			"--head",
			branch,
			"--state",
			"merged",
			"--json",
			"number",
			"--jq",
			"length",
		],
		{ cwd, encoding: "utf8" },
	)
	if (pr.status === 0 && Number(pr.stdout.trim()) > 0) return true
	return (
		git(["branch", "--merged", "origin/main", "--list", branch], cwd) !== ""
	)
}

async function destroy(
	name: string | undefined,
	{ force = false }: { force?: boolean },
): Promise<void> {
	if (!name) throw new Error("destroy needs <name>")
	const worktrees = listWorktrees()
	const worktree = findWorktree(worktrees, name)
	if (worktree.isMain) throw new Error("Refusing to destroy the main checkout")
	const [main] = worktrees
	if (!main) throw new Error("git worktree list returned nothing")

	const dirty = git(["status", "--porcelain"], worktree.path)
	if (dirty && !force) {
		throw new Error(
			`${worktree.name} has uncommitted changes; commit them or pass --force:\n${dirty}`,
		)
	}
	await stop(name)
	git(
		["worktree", "remove", ...(force ? ["--force"] : []), worktree.path],
		main.path,
	)
	console.log(`Removed ${worktree.path}`)

	const state = await readState()
	delete state.worktrees[worktree.path]
	await writeState(pruneState(state, listWorktrees()))

	if (!worktree.branch) return
	if (isMerged(worktree.branch, main.path)) {
		git(["branch", "-D", worktree.branch], main.path)
		console.log(`Deleted merged branch ${worktree.branch}`)
	} else {
		console.log(`Kept branch ${worktree.branch} (not merged)`)
	}
}

async function main(): Promise<void> {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			branch: { type: "string" },
			deps: { type: "boolean", default: false },
			purpose: { type: "string" },
			force: { type: "boolean", default: false },
			help: { type: "boolean", default: false },
		},
	})
	const [command, name] = positionals
	switch (values.help ? "help" : command) {
		case "create":
			return create(name, values)
		case "start":
			return start(name)
		case "stop":
			return stop(name)
		case "status":
			return status()
		case "destroy":
			return destroy(name, values)
		default:
			console.log(USAGE)
			if (command && command !== "help") process.exitCode = 1
	}
}

main().catch((error: unknown) => {
	console.error(`wt: ${error instanceof Error ? error.message : String(error)}`)
	process.exit(1)
})
