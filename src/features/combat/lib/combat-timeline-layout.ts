import type { CombatTimeline, TimelineEntry } from "./combat-timeline"

/** The timeline's fixed measures, in px: the scale, the cards, the ruler and the start columns. */
export const TIMELINE_GEOMETRY = {
	pxPerSecond: 80,
	/** Where 0 s sits, under the top edge. */
	top: 26,
	bottom: 24,
	cardHeight: 26,
	cardGap: 4,
	/** The ruler's labels; its lines start here. */
	ruler: 40,
	/** The first start column's center, and the distance to the next one. */
	firstColumn: 54,
	columnGap: 14,
	/** Room for the connectors between the last column and the cards. */
	connector: 22,
	/** Each lane's width at the right. */
	lane: 16,
} as const

/** A ruler line every half second; the whole seconds are labeled stronger. */
const TICK_EVERY = 0.5

export type TimelineCardLayout = {
	entry: TimelineEntry
	/** The y of the moment it stands for: a step's start, a delayed hit's landing, a marker's time. */
	anchor: number
	/** Its card's top: at its moment, or pushed down below the card before it. */
	top: number
}

export type TimelineLayout = {
	cards: TimelineCardLayout[]
	ticks: { time: number; y: number; major: boolean }[]
	height: number
	/** Where the cards start, past the start columns and their connectors. */
	cardsLeft: number
	/** The lanes' total width. */
	lanesWidth: number
}

/** The y of a moment of the combo, to a tenth of a pixel. */
export function timelineY(time: number): number {
	const y = TIMELINE_GEOMETRY.top + time * TIMELINE_GEOMETRY.pxPerSecond
	return Math.round(y * 10) / 10
}

/** The x of a start column's center. */
export function columnX(column: number): number {
	return TIMELINE_GEOMETRY.firstColumn + column * TIMELINE_GEOMETRY.columnGap
}

function anchorTime(entry: TimelineEntry) {
	return entry.kind === "step" ? entry.startsAt : entry.time
}

/**
 * Where everything goes: each card centered on its moment unless the card before it is still
 * there (steps that start together stack downwards), the ruler down to the last card or moment.
 */
export function timelineLayout(timeline: CombatTimeline): TimelineLayout {
	const { cardHeight, cardGap, top, bottom, pxPerSecond } = TIMELINE_GEOMETRY
	let below = 0
	const cards = timeline.entries.map((entry) => {
		const anchor = timelineY(anchorTime(entry))
		const cardTop = Math.max(anchor - cardHeight / 2, below)
		below = cardTop + cardHeight + cardGap
		return { entry, anchor, top: cardTop }
	})
	const lastMoment = Math.max(
		timeline.lastHit,
		timeline.effectsUntil,
		...timeline.entries.map(anchorTime),
	)
	const height = Math.max(timelineY(lastMoment) + bottom, below + bottom)
	const lastTick =
		Math.floor((height - top - bottom / 2) / pxPerSecond / TICK_EVERY) *
		TICK_EVERY
	const ticks = Array.from(
		{ length: Math.round(lastTick / TICK_EVERY) + 1 },
		(_, step) => {
			const time = step * TICK_EVERY
			return { time, y: timelineY(time), major: step % 2 === 0 }
		},
	)
	return {
		cards,
		ticks,
		height,
		cardsLeft: columnX(timeline.columns - 1) + TIMELINE_GEOMETRY.connector,
		lanesWidth: timeline.lanes.length * TIMELINE_GEOMETRY.lane,
	}
}
