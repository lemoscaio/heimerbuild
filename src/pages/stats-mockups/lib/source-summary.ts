import { formatBonus, formatTotal, type ValueFormat } from "./format-values"
import type { StatPart, StatPartKind } from "./stat-composition"

/** A row's parts summed by kind of source; the previewed item is a kind of its own. */
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

/** The parts summed by kind, in legend order; kinds with nothing are left out. */
export function sourceTotals(parts: readonly StatPart[]): SourceTotal[] {
	const sums = new Map<SourceKind, number>()
	for (const { kind, value, preview } of parts) {
		const key = preview ? "preview" : kind
		sums.set(key, (sums.get(key) ?? 0) + value)
	}
	return SOURCE_KINDS.flatMap((kind) => {
		const value = sums.get(kind)
		return value === undefined || Math.abs(value) < 1e-9
			? []
			: [{ kind, value }]
	})
}

export type BarSegment = { kind: SourceKind; start: number; width: number }

type RowBar = {
	/** Each positive source's place on the bar, as fractions of its length. */
	segments: BarSegment[]
	/** What negative sources take back from the end of the positive ones (Rockets' attack speed). */
	lost?: { start: number; width: number }
	/** Where the marked total sits. */
	markerAt?: number
}

/** A bar long enough for every positive source and the marked total (another form's). */
export function rowBar(
	totals: readonly SourceTotal[],
	{ marker }: { marker?: number } = {},
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

/** Each source's part in words: "0.625 base · +110% items · +80% effects". */
export function sourceLine(
	totals: readonly SourceTotal[],
	valueFormat: ValueFormat,
): string {
	return totals
		.map(({ kind, value }) =>
			kind === "base"
				? `${formatTotal(value, valueFormat)} base`
				: `${formatBonus(value, valueFormat)} ${SOURCE_LABELS[kind]}`,
		)
		.join(" · ")
}
