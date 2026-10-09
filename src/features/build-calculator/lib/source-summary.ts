import type { StatPart, StatPartKind } from "@/lib/stats/stat-composition"

/** A row's parts summed by kind of source; previewed parts are a kind of their own. */
export type SourceKind = StatPartKind | "preview"

export type SourceTotal = { kind: SourceKind; value: number }

/** Legend order, which is also the order sources join the build. */
export const SOURCE_KINDS: readonly SourceKind[] = [
	"base",
	"level",
	"form",
	"item",
	"shards",
	"ranks",
	"effect",
	"preview",
]

export const SOURCE_LABELS: Readonly<Record<SourceKind, string>> = {
	base: "base",
	level: "level",
	form: "form",
	item: "items",
	shards: "shards",
	ranks: "ranks",
	effect: "effects",
	preview: "preview",
}

// Below display precision: what float sums leave where the value is none.
const EPSILON = 1e-9

/** The parts summed by kind, in legend order; kinds that add nothing are left out. */
export function sourceTotals(parts: readonly StatPart[]): SourceTotal[] {
	const sums = new Map<SourceKind, number>()
	for (const { kind, value, preview } of parts) {
		const key = preview ? "preview" : kind
		sums.set(key, (sums.get(key) ?? 0) + value)
	}
	return SOURCE_KINDS.flatMap((kind) => {
		const value = sums.get(kind)
		return value === undefined || Math.abs(value) < EPSILON
			? []
			: [{ kind, value }]
	})
}

export type BarSegment = { kind: SourceKind; start: number; width: number }

export type RowBar = {
	/** Each positive kind's place on the bar, as fractions of its length. */
	segments: BarSegment[]
	/** What negative kinds take back from the end of the positive ones (Mega Gnar's range). */
	lost?: { start: number; width: number }
	/** Where the marked total sits (the other form's). */
	markerAt?: number
}

type RowBarOptions = {
	/** A total to mark on the bar, which then reaches it. */
	marker?: number
}

/** A bar long enough for every positive kind and the marked total. */
export function rowBar(
	totals: readonly SourceTotal[],
	{ marker }: RowBarOptions = {},
): RowBar {
	const positive = totals.reduce(
		(sum, { value }) => sum + Math.max(0, value),
		0,
	)
	const negative = totals.reduce(
		(sum, { value }) => sum + Math.min(0, value),
		0,
	)
	const scale = Math.max(positive, marker ?? 0)
	if (scale <= 0) return { segments: [] }
	const segments: BarSegment[] = []
	let end = 0
	for (const { kind, value } of totals) {
		if (value <= 0) continue
		segments.push({ kind, start: end / scale, width: value / scale })
		end += value
	}
	return {
		segments,
		...(negative < 0 && {
			lost: { start: (end + negative) / scale, width: -negative / scale },
		}),
		...(marker !== undefined && { markerAt: marker / scale }),
	}
}
