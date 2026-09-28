import { basename, dirname, join } from "node:path"

export const MAIN_PORT = 5173
export const FIRST_WORKTREE_PORT = 5174
export const CLAUDE_PREFIX = "claude-"

/** `~/.heimerbuild-wt.json`, keyed by absolute worktree path. */
export type WtState = {
	worktrees: Record<string, { port: number; pid?: number }>
}

export type Worktree = {
	name: string
	path: string
	branch: string | undefined
	isMain: boolean
}

export function emptyState(): WtState {
	return { worktrees: {} }
}

export function parseState(text: string | undefined): WtState {
	if (!text?.trim()) return emptyState()
	const parsed = JSON.parse(text) as Partial<WtState>
	return { worktrees: { ...(parsed.worktrees ?? {}) } }
}

/** Claude-created worktrees are recognizable at a glance for safe cleanup. */
export function worktreeName(
	name: string,
	{ claude = false }: { claude?: boolean } = {},
): string {
	if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
		throw new Error(
			`Invalid worktree name "${name}": use lowercase letters, digits and dashes`,
		)
	}
	return claude && !name.startsWith(CLAUDE_PREFIX)
		? `${CLAUDE_PREFIX}${name}`
		: name
}

/** `../heimerbuild` + `foo` -> `../heimerbuild-foo`, next to the main checkout. */
export function worktreePath(mainPath: string, name: string): string {
	return join(dirname(mainPath), `${basename(mainPath)}-${name}`)
}

/** Parses `git worktree list --porcelain`; the first entry is the main checkout. */
export function parseWorktreeList(porcelain: string): Worktree[] {
	const blocks = porcelain.trim().split(/\n\n+/).filter(Boolean)
	const entries = blocks.map((block) => {
		const lines = block.split("\n")
		const path = lines
			.find((line) => line.startsWith("worktree "))
			?.slice("worktree ".length)
		const branch = lines
			.find((line) => line.startsWith("branch "))
			?.slice("branch refs/heads/".length)
		if (!path) throw new Error(`Unexpected git worktree output:\n${block}`)
		return { path, branch }
	})
	const mainPath = entries[0]?.path ?? ""
	const prefix = `${basename(mainPath)}-`
	return entries.map(({ path, branch }, index) => {
		const folder = basename(path)
		const isMain = index === 0
		return {
			path,
			branch,
			isMain,
			name: isMain
				? "main"
				: folder.startsWith(prefix)
					? folder.slice(prefix.length)
					: folder,
		}
	})
}

/**
 * The stored port, or the lowest free one from 5174 that no other worktree holds.
 * The main checkout always uses 5173.
 */
export function assignPort(
	state: WtState,
	worktree: Pick<Worktree, "path" | "isMain">,
	isPortBusy: (port: number) => boolean,
): number {
	if (worktree.isMain) return MAIN_PORT
	const stored = state.worktrees[worktree.path]?.port
	if (stored) return stored
	const taken = new Set(Object.values(state.worktrees).map(({ port }) => port))
	let port = FIRST_WORKTREE_PORT
	while (taken.has(port) || isPortBusy(port)) port++
	return port
}

/** Drops entries for worktrees git no longer knows about. */
export function pruneState(state: WtState, worktrees: Worktree[]): WtState {
	const paths = new Set(worktrees.map(({ path }) => path))
	return {
		worktrees: Object.fromEntries(
			Object.entries(state.worktrees).filter(([path]) => paths.has(path)),
		),
	}
}

export function claudeWorktreeFile({
	created,
	branch,
	purpose,
}: {
	created: Date
	branch: string
	purpose: string
}): string {
	// en-CA formats as YYYY-MM-DD in the local time zone.
	return `created: ${created.toLocaleDateString("en-CA")}\nbranch: ${branch}\npurpose: ${purpose}\n`
}
