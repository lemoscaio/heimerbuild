import type { ComboStart } from "@/lib/combat/combo-link"
import type { BuildEffect } from "@/lib/effects/effect"

/** A "Combo start" chip: a cooldown ready (opt-out), a stacking effect at a count or a buff running (opt-in). */
export type CombatStartChip =
	| {
			kind: "ready"
			id: string
			/** "Electrocute ready". */
			label: string
	  }
	| {
			kind: "stacks"
			id: string
			/** "Conqueror". */
			name: string
			count: number
			max: number
	  }
	| {
			kind: "running"
			id: string
			/** "Highlander running". */
			label: string
	  }

/** What "+" adds back or adds, by group: removed cooldowns, stacking effects and buffs not in the start. */
export type CombatStartAdditions = {
	ready: readonly { id: string; label: string }[]
	stacks: readonly { id: string; name: string; max: number }[]
	running: readonly { id: string; label: string }[]
}

/** The build's effects the combo's start can set, in the champion's form. */
export type CombatStartEffects = {
	cooldowns: readonly BuildEffect[]
	stacks: readonly BuildEffect[]
	running: readonly BuildEffect[]
}

export type CombatStartView = {
	chips: readonly CombatStartChip[]
	additions: CombatStartAdditions
}

function startName({ name, effect }: BuildEffect) {
	return effect.label ? `${name} (${effect.label})` : name
}

/**
 * The strip's chips and "+" groups (issue 317): each cooldown ready unless `onCooldown` names it;
 * the stacks and running buffs the start holds, in the order they were added.
 */
export function combatStartView(
	{ cooldowns, stacks, running }: CombatStartEffects,
	start: ComboStart,
): CombatStartView {
	const stackById = new Map(stacks.map((effect) => [effect.id, effect]))
	const runningById = new Map(running.map((effect) => [effect.id, effect]))
	const readyLabel = (effect: BuildEffect) => `${startName(effect)} ready`
	const runningLabel = (effect: BuildEffect) => `${startName(effect)} running`
	const maxOf = (effect: BuildEffect) => effect.effect.stacks?.max ?? 1

	const chips: CombatStartChip[] = [
		...cooldowns
			.filter(({ id }) => !start.onCooldown.includes(id))
			.map((effect) => ({
				kind: "ready" as const,
				id: effect.id,
				label: readyLabel(effect),
			})),
		...start.stacks.flatMap(({ id, count }) => {
			const effect = stackById.get(id)
			if (!effect) return []
			const max = maxOf(effect)
			const chip: CombatStartChip = {
				kind: "stacks",
				id,
				name: startName(effect),
				count: Math.min(count, max),
				max,
			}
			return [chip]
		}),
		...start.running.flatMap((id) => {
			const effect = runningById.get(id)
			return effect
				? [{ kind: "running" as const, id, label: runningLabel(effect) }]
				: []
		}),
	]
	return {
		chips,
		additions: {
			ready: cooldowns
				.filter(({ id }) => start.onCooldown.includes(id))
				.map((effect) => ({ id: effect.id, label: readyLabel(effect) })),
			stacks: stacks
				.filter(({ id }) => !start.stacks.some((stack) => stack.id === id))
				.map((effect) => ({
					id: effect.id,
					name: startName(effect),
					max: maxOf(effect),
				})),
			running: running
				.filter(({ id }) => !start.running.includes(id))
				.map((effect) => ({ id: effect.id, label: runningLabel(effect) })),
		},
	}
}
