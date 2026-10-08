import type {
	Amount,
	Effect,
	MatchStackSource,
	MatchStacksAmount,
	StacksThreshold,
} from "./effect"

/** Stacks by source id; a source without an entry has none. */
export type MatchStacks = Readonly<Record<string, number>>

/** Only guards typos for an uncapped source: Nasus and Veigar pass 1000 in long games. */
export const MAX_MATCH_STACKS = 9999

/** The most stacks a source holds: its cap, or 9999. */
export function maxStacksOf(source: MatchStackSource | undefined): number {
	return source?.capped ? source.sliderMax : MAX_MATCH_STACKS
}

/** A typed or stepped count as whole stacks, 0 to the source's most (9999 without one). */
export function clampMatchStacks(
	count: number,
	source?: MatchStackSource,
): number {
	return Math.min(maxStacksOf(source), Math.max(0, Math.round(count)))
}

/** The stacks a source has, up to its cap: none without an entry. */
export function stacksOf(
	stacks: MatchStacks | undefined,
	source: MatchStackSource,
) {
	return Math.min(stacks?.[source.id] ?? 0, maxStacksOf(source))
}

/** Whether the build's stacks reach the threshold (Mejai's 10 Glory). */
export function reachesThreshold(
	stacks: MatchStacks | undefined,
	{ source, stacks: needed }: StacksThreshold,
): boolean {
	return stacksOf(stacks, source) >= needed
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

function matchStacksAmounts(amount: Amount): MatchStacksAmount[] {
	if (typeof amount !== "object") return []
	if (amount.by === "matchStacks") return [amount]
	return amount.by === "stat" ? matchStacksAmounts(amount.ratio) : []
}

/**
 * The next count of `source` past the build's at which one of the effect's stepped amounts changes
 * (Mark of the Kindred: 7 marks after 4), or none past the last step.
 */
export function nextMatchStacksStep(
	{ grants }: Effect,
	source: MatchStackSource,
	stacks: MatchStacks | undefined,
): number | undefined {
	const count = stacksOf(stacks, source)
	const next = grants
		.flatMap((grant) =>
			"amount" in grant ? matchStacksAmounts(grant.amount) : [],
		)
		.filter((amount) => amount.source.id === source.id)
		.flatMap(({ steps = [] }) => steps.map(({ from }) => from))
		.filter((from) => from > count && from <= maxStacksOf(source))
	return next.length ? Math.min(...next) : undefined
}

function amountSources(amount: Amount): MatchStackSource[] {
	if (typeof amount !== "object") return []
	if (amount.by === "matchStacks") return [amount.source]
	return amount.by === "stat" ? amountSources(amount.ratio) : []
}

/** The match stack sources the effect reads, once each (Phenomenal Evil for Veigar's passive). */
export function matchStackSources({ grants }: Effect): MatchStackSource[] {
	const sources = grants.flatMap((grant) => [
		...("amount" in grant ? amountSources(grant.amount) : []),
		...(grant.from ? [grant.from.source] : []),
	])
	return sources.filter(
		(source, index) =>
			sources.findIndex(({ id }) => id === source.id) === index,
	)
}

/** The stacks without the sources none of `effects` reads, each up to its cap; as given while the effects load. */
export function usedMatchStacks(
	stacks: MatchStacks | undefined,
	effects: readonly Effect[] | undefined,
): MatchStacks | undefined {
	if (!effects || !stacks) return stacks
	const used = new Map(
		effects.flatMap((effect) =>
			matchStackSources(effect).map((source) => [source.id, source] as const),
		),
	)
	const kept = Object.keys(stacks).flatMap((id) => {
		const source = used.get(id)
		return source ? [[id, stacksOf(stacks, source)] as const] : []
	})
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
