import type { BuildEffect, StartOption } from "@/lib/effects/effect"

/** A starting situation as the Combo tab offers it. */
export type CombatStartOption = { id: string; label: string; on: boolean }

const START_LABELS = {
	marked: (name) => `Target marked by ${name}`,
	running: (name) => `${name} ready`,
} as const satisfies Record<StartOption["kind"], (name: string) => string>

/** "Target marked by Harrier", "Short Fuse ready". */
export function startOptionLabel({ name, effect }: BuildEffect): string {
	return effect.start ? START_LABELS[effect.start.kind](name) : name
}

/**
 * The chosen situations the build still supports, in the options' order; as given while the
 * options load (`undefined`), so a choice survives the build's data loading.
 */
export function readCombatStart(
	chosen: readonly string[],
	options: readonly Pick<BuildEffect, "id">[] | undefined,
): string[] {
	if (!options) return [...chosen]
	return options.flatMap(({ id }) => (chosen.includes(id) ? [id] : []))
}

/** The choice with `id` turned on or off. */
export function toggleCombatStart(
	chosen: readonly string[],
	id: string,
	on: boolean,
): string[] {
	const others = chosen.filter((entry) => entry !== id)
	return on ? [...others, id] : others
}
