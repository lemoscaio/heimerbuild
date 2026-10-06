import type { Champion } from "@schemas/champion"
import type { CombatAction } from "@/lib/combat/combat"
import { CURATED_COMBAT_CHAMPIONS } from "@/lib/combat/curated-champions"
import {
	type CombatInput as SimulationInput,
	simulateCombat,
} from "@/lib/combat/simulate-combat"
import { abilitiesInForm } from "@/lib/form-abilities"
import { combatFormId } from "../lib/combat-form"
import { combatKeys } from "../lib/combat-keys"
import {
	addStep,
	type CombatEntry,
	MAX_COMBAT_STEPS,
	moveStep,
	removeStep,
	setWaitSeconds,
} from "../lib/combat-sequence"

/** What the combo runs on, injected: the build, its effects (`combatEffects`), its summoner slots, the target and the starting situation. */
export type CombatInput = Omit<SimulationInput, "actions">

type UseCombatOptions = {
	/** Undefined while the build's data loads. */
	input: CombatInput | undefined
	value: readonly CombatEntry[]
	onChange: (value: CombatEntry[]) => void
}

export type Combat = ReturnType<typeof useCombat>

function isCurated({ key }: Champion) {
	return CURATED_COMBAT_CHAMPIONS.includes(key)
}

/**
 * The combo, controlled by `value` (its steps) and simulated on the injected build and target.
 * It never reads the stats panel's switches (`simulateCombat` starts from the trigger defaults).
 */
export function useCombat({ input, value, onChange }: UseCombatOptions) {
	const result =
		input &&
		simulateCombat({ ...input, actions: value.map(({ action }) => action) })
	const champion = input?.build.champion
	const formId = input && combatFormId(input.build)
	const spells = champion
		? abilitiesInForm(champion.abilities, formId).spells
		: []

	return {
		steps: value,
		result,
		keys: input
			? combatKeys({
					spells,
					ranks: input.build.ranks,
					summoners: input.summoners,
				})
			: [],
		/** The champion's abilities as the selected form shows them. */
		spells,
		/** The champion's damage was checked on the wiki (`CURATED_COMBAT_CHAMPIONS`). */
		isCurated: champion ? isCurated(champion) : true,
		isFull: value.length >= MAX_COMBAT_STEPS,
		add: (action: CombatAction) => onChange(addStep(value, action)),
		remove: (id: number) => onChange(removeStep(value, id)),
		move: (id: number, to: number) => onChange(moveStep(value, id, to)),
		setWait: (id: number, seconds: number) =>
			onChange(setWaitSeconds(value, id, seconds)),
		clear: () => onChange([]),
	}
}
