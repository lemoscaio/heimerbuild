import { clampMatchStacks } from "@/lib/effects/match-stacks"

/** Where the slider's thumb sits: at the count, or at its end for a count past the slider's max. */
export function sliderStacks(count: number, sliderMax: number): number {
	return Math.min(count, sliderMax)
}

/** The count a field edit sets: a typed or stepped number as whole stacks; an emptied field sets none. */
export function stacksFromField(next: number | null): number | undefined {
	return next === null ? undefined : clampMatchStacks(next)
}
