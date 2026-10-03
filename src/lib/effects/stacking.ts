import type { BuildEffect, Stacking, StackingRule } from "./effect"

/** The effects that apply, and each stacked-out effect (by id) with the one that won its group. */
export type StackingResult = {
	active: BuildEffect[]
	stackedOut: ReadonlyMap<string, BuildEffect>
}

type PickWinner = (
	group: readonly BuildEffect[],
	sizeOf: (effect: BuildEffect) => number,
) => BuildEffect | undefined

function priorityOf(stacking: Stacking | undefined) {
	return stacking?.rule === "replace" ? stacking.priority : 0
}

function largest(
	group: readonly BuildEffect[],
	measure: (effect: BuildEffect) => number,
) {
	return group.reduce<BuildEffect | undefined>(
		(best, effect) =>
			best === undefined || measure(effect) > measure(best) ? effect : best,
		undefined,
	)
}

const PICK_WINNER = {
	replace: (group) =>
		largest(group, ({ effect }) => priorityOf(effect.stacking)),
	highest: (group, sizeOf) => largest(group, sizeOf),
	unique: (group) => group[0],
} as const satisfies Record<StackingRule, PickWinner>

/**
 * Resolves each stacking group of the effects that are on: one effect applies per group, picked
 * by the group's rule; effects without a group all apply (they add up).
 */
export function resolveStacking(
	on: readonly BuildEffect[],
	sizeOf: (effect: BuildEffect) => number,
): StackingResult {
	const groups = new Map<string, BuildEffect[]>()
	for (const effect of on) {
		const group = effect.effect.stacking?.group
		if (group) groups.set(group, [...(groups.get(group) ?? []), effect])
	}
	const stackedOut = new Map<string, BuildEffect>()
	for (const group of groups.values()) {
		const rule = group[0]?.effect.stacking?.rule ?? "unique"
		const winner = PICK_WINNER[rule](group, sizeOf)
		for (const effect of group) {
			if (winner && effect !== winner) stackedOut.set(effect.id, winner)
		}
	}
	return {
		active: on.filter(({ id }) => !stackedOut.has(id)),
		stackedOut,
	}
}
