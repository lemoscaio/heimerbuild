import type { BuildEffect, StartOption } from "@/lib/effects/effect"

/** A situation the Combo tab offers as a marker chip, by the effect that declares it. */
export type CombatSituation = {
	id: string
	label: string
	kind: StartOption["kind"]
}

const SITUATION_LABELS = {
	marked: (name) => `Target marked by ${name}`,
	running: (name) => `${name} ready`,
} as const satisfies Record<StartOption["kind"], (name: string) => string>

/** "Target marked by Harrier", "Short Fuse ready". */
export function situationLabel({ name, effect }: BuildEffect): string {
	return effect.start ? SITUATION_LABELS[effect.start.kind](name) : name
}

/** The situations of the build's effects that declare one (`combatStartOptions`), as chips. */
export function combatSituations(
	effects: readonly BuildEffect[],
): CombatSituation[] {
	return effects.flatMap(({ effect, ...bound }) =>
		effect.start
			? [
					{
						id: bound.id,
						label: situationLabel({ ...bound, effect }),
						kind: effect.start.kind,
					},
				]
			: [],
	)
}
