import { clampMatchStacks } from "@/lib/effects/match-stacks"

/** The pressed presets, as the toggle group's values: the one equal to the count, if any. */
export function pressedStackPresets(
	presets: readonly number[],
	count: number,
): string[] {
	return presets.filter((preset) => preset === count).map(String)
}

/** The count a field edit sets: a typed or stepped number as whole stacks; an emptied field sets none. */
export function stacksFromField(next: number | null): number | undefined {
	return next === null ? undefined : clampMatchStacks(next)
}

/** The count a preset pick sets; clicking the pressed preset again (no value) sets none, so it stays. */
export function stacksFromPreset([preset]: string[]): number | undefined {
	return preset === undefined ? undefined : Number(preset)
}
