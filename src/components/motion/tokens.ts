import type { Transition } from "motion/react"

/** Durations in seconds. Nothing animates longer than `slow` (tokens.test.ts). */
export const duration = {
	fast: 0.15,
	base: 0.2,
	slow: 0.3,
} as const

export const easing = {
	/** Entrances, exits and size changes: fast start, soft landing. */
	out: [0.22, 1, 0.36, 1],
	/** Things moving from one place to another on screen. */
	inOut: [0.65, 0, 0.35, 1],
} as const

/** A `Stagger` spreads its items' start times over this window, however many items it has. */
export const staggerSpread = duration.fast

export const transitions = {
	/** The app default, set on `MotionProvider`'s `MotionConfig`. */
	base: { duration: duration.base, ease: easing.out },
	/** The default under reduced motion: every change lands at once. */
	instant: { duration: 0 },
} satisfies Record<string, Transition>
