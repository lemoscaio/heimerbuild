import type { Amount, Effect, MatchStackSource } from "./effect"

/** Stacks by source id; a source without an entry has none. */
export type MatchStacks = Readonly<Record<string, number>>

/** Only guards typos: Nasus and Veigar pass 1000 in long games. */
export const MAX_MATCH_STACKS = 9999

/** A typed or stepped count as whole stacks, 0 to 9999. */
export function clampMatchStacks(count: number): number {
	return Math.min(MAX_MATCH_STACKS, Math.max(0, Math.round(count)))
}

/** The stacks a source has: none without an entry. */
export function stacksOf(stacks: MatchStacks | undefined, sourceId: string) {
	return stacks?.[sourceId] ?? 0
}

/** The stacks with `sourceId` at `count`; 0 leaves the stacks, and none left is `undefined`. */
export function withMatchStacks(
	stacks: MatchStacks | undefined,
	sourceId: string,
	count: number,
): MatchStacks | undefined {
	const { [sourceId]: _previous, ...others } = stacks ?? {}
	const next = count > 0 ? { ...others, [sourceId]: count } : others
	return Object.keys(next).length ? next : undefined
}

function amountSources(amount: Amount): MatchStackSource[] {
	if (typeof amount !== "object") return []
	if (amount.by === "matchStacks") return [amount.source]
	return amount.by === "stat" ? amountSources(amount.ratio) : []
}

/** The match stack sources the effect reads, once each (Phenomenal Evil for Veigar's passive). */
export function matchStackSources({ grants }: Effect): MatchStackSource[] {
	const sources = grants.flatMap((grant) =>
		"amount" in grant ? amountSources(grant.amount) : [],
	)
	return sources.filter(
		(source, index) =>
			sources.findIndex(({ id }) => id === source.id) === index,
	)
}

/** The stacks without the sources none of `effects` reads; as given while the effects load. */
export function usedMatchStacks(
	stacks: MatchStacks | undefined,
	effects: readonly Effect[] | undefined,
): MatchStacks | undefined {
	if (!effects || !stacks) return stacks
	const used = new Set(
		effects.flatMap((effect) => matchStackSources(effect).map(({ id }) => id)),
	)
	const kept = Object.entries(stacks).filter(([id]) => used.has(id))
	return kept.length ? Object.fromEntries(kept) : undefined
}

const ID = "[a-z0-9]+(?:-[a-z0-9]+)*"
const COUNT = "\\d{1,4}"
const SEPARATOR = "."
const ENTRY = new RegExp(`^(${ID})-(${COUNT})$`)

/** Shape of the `stacks` URL value: `<source id>-<count>` entries, `.` between them. */
export const STACKS_PARAM_PATTERN = new RegExp(
	`^${ID}-${COUNT}(?:\\${SEPARATOR}${ID}-${COUNT})*$`,
)

/** Reads `siphoning-strike-250.phenomenal-evil-80`; no or an unreadable value as none, 0 counts left out. */
export function parseMatchStacks(
	value: string | undefined,
): MatchStacks | undefined {
	if (!value || !STACKS_PARAM_PATTERN.test(value)) return undefined
	const entries = value.split(SEPARATOR).flatMap((entry) => {
		const [, id, count] = ENTRY.exec(entry) ?? []
		return id && Number(count) > 0 ? [[id, Number(count)] as const] : []
	})
	return entries.length ? Object.fromEntries(entries) : undefined
}

/** The `stacks` URL value; `undefined` without any stacks. */
export function serializeMatchStacks(
	stacks: MatchStacks | undefined,
): string | undefined {
	const entries = Object.entries(stacks ?? {}).filter(([, count]) => count > 0)
	if (!entries.length) return undefined
	return entries.map(([id, count]) => `${id}-${count}`).join(SEPARATOR)
}
