// PROTOTYPE (PR 434, remove before merge): the "outside" layout, each proc among the steps at its land time.

/** An item of a list, or a proc of one of them placed among them at its land time. */
export type OutsideEntry<Item, Proc> =
	| { kind: "item"; item: Item }
	| { kind: "proc"; proc: Proc; owner: Item }

type ProcsOutsideOptions<Item, Proc> = {
	/** When the item happens; none (a marker) never moves a proc past it. */
	timeOf: (item: Item) => number | undefined
	procsOf: (item: Item) => readonly Proc[]
}

/**
 * The items in their order with each item's procs after it, each placed before the first later
 * item that happens after it lands: Arcane Comet at 0.80 s after the attack that started at 0.50 s.
 */
export function procsOutside<Item, Proc extends { time: number }>(
	items: readonly Item[],
	{ timeOf, procsOf }: ProcsOutsideOptions<Item, Proc>,
): OutsideEntry<Item, Proc>[] {
	const entries: OutsideEntry<Item, Proc>[] = []
	let pending: { proc: Proc; owner: Item }[] = []
	const flush = (before: number) => {
		const due = pending.filter(({ proc }) => proc.time < before)
		pending = pending.filter((entry) => !due.includes(entry))
		for (const entry of due) entries.push({ kind: "proc", ...entry })
	}
	for (const item of items) {
		const time = timeOf(item)
		if (time !== undefined) flush(time)
		entries.push({ kind: "item", item })
		pending = [
			...pending,
			...procsOf(item).map((proc) => ({ proc, owner: item })),
		].toSorted((a, b) => a.proc.time - b.proc.time)
	}
	flush(Number.POSITIVE_INFINITY)
	return entries
}
