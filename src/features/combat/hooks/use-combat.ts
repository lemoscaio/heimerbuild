import type { AbilitySlot, Champion } from "@schemas/champion"
import { areaTicks } from "@/lib/combat/area-ticks"
import { type CombatAction, MAX_COMBAT_STEPS } from "@/lib/combat/combat"
import { CURATED_COMBAT_CHAMPIONS } from "@/lib/combat/curated-champions"
import { outcomeKeys } from "@/lib/combat/outcomes"
import {
	abilityTimeInArea,
	abilityVariants,
	abilityVariantsLabel,
	LANDS_LABEL,
} from "@/lib/combat/registries/ability-hits"
import {
	type CombatInput as SimulationInput,
	simulateCombat,
	simulateFreeCombat,
} from "@/lib/combat/simulate-combat"
import { startCooldownEffects } from "@/lib/combat/start-cooldowns"
import { combatStartOptions } from "@/lib/combat/start-options"
import { abilitiesInForm } from "@/lib/form-abilities"
import { combatFormId } from "../lib/combat-form"
import { combatKeys } from "../lib/combat-keys"
import {
	addStep,
	insertStep,
	moveEntries,
	setStepInArea,
	setStepVariant,
	setWaitSeconds,
} from "../lib/combat-sequence"
import { combatSituations } from "../lib/combat-situations"
import { combatStartChips } from "../lib/combat-start"
import {
	type CombatState,
	changedChoices,
	choicesByItem,
	EMPTY_COMBAT,
	removeEntry,
	setFreeChoice,
	setStartReady,
} from "../lib/combat-state"

/** What the combo runs on, injected: the build, its effects (`combatEffects`), its summoner slots and the target. */
export type CombatInput = Omit<
	SimulationInput,
	"actions" | "free" | "startOnCooldown"
>

type UseCombatOptions = {
	/** Undefined while the build's data loads. */
	input: CombatInput | undefined
	value: CombatState
	onChange: (value: CombatState) => void
}

export type Combat = ReturnType<typeof useCombat>

/** Where a new marker goes in the combo (issue 344). */
export type MarkerPlace = "start" | "end"

function isCurated({ key }: Champion) {
	return CURATED_COMBAT_CHAMPIONS.includes(key)
}

/** The combo's result: strict, or free mode's with the outcomes it computed (`seed`, by item). */
function simulate(
	input: CombatInput,
	{ entries, free, choices, onCooldown }: CombatState,
) {
	const run = {
		...input,
		actions: entries.map(({ action }) => action),
		startOnCooldown: onCooldown,
	}
	if (!free) return { result: simulateCombat(run) }
	return simulateFreeCombat(run, choicesByItem(entries, choices))
}

/**
 * The combo, controlled by `value` (its entries, free mode and its choices) and simulated on the
 * injected build and target. It never reads the stats panel's switches (`simulateCombat` starts
 * from the trigger defaults). The actions that add or remove return the value they saved.
 */
export function useCombat({ input, value, onChange }: UseCombatOptions) {
	const { entries } = value
	const simulated = input && simulate(input, value)
	const champion = input?.build.champion
	const formId = input && combatFormId(input.build)
	const spells = champion
		? abilitiesInForm(champion.abilities, formId).spells
		: []
	const effects = input?.effects ?? []

	function save(next: CombatState) {
		onChange(next)
		return next
	}
	const saveEntries = (next: CombatState["entries"]) =>
		save({ ...value, entries: next })
	const variantsOf = (slot: AbilitySlot) =>
		input
			? abilityVariants({
					championKey: input.build.champion.key,
					patch: input.build.patch,
					slot,
				})
			: []
	const timeInAreaOf = (slot: AbilitySlot) =>
		input
			? abilityTimeInArea({
					championKey: input.build.champion.key,
					patch: input.build.patch,
					slot,
				})
			: undefined

	return {
		value,
		entries,
		free: value.free,
		result: simulated?.result,
		/** Free mode's computed outcomes by item, which the choices start from. */
		seed: simulated && "seed" in simulated ? simulated.seed : undefined,
		/** How many free mode choices differ from the computed outcomes. */
		changes:
			simulated && "seed" in simulated
				? changedChoices(entries, value.choices, simulated.seed)
				: 0,
		keys: input
			? combatKeys({
					spells,
					ranks: input.build.ranks,
					summoners: input.summoners,
				})
			: [],
		/** The build's cooldowns the combo starts with, each ready unless removed ("Combo start"). */
		startChips: combatStartChips(
			startCooldownEffects(effects, formId),
			value.onCooldown,
		),
		/** Starts the effect's cooldown ready, or on cooldown. */
		setStartReady: (effectId: string, ready: boolean) =>
			save(setStartReady(value, effectId, ready)),
		/** The situations the build supports, which a marker can set. */
		situations: combatSituations(combatStartOptions(effects, formId)),
		/** The outcomes an attack can have, which ability steps say they lack. */
		attackOutcomes: outcomeKeys({ kind: "attack" }, effects, formId),
		/** The ways an ability's cast can land, picked per step (Decimate's blade or handle). */
		variants: variantsOf,
		/** How long the target may stay in an ability's area, picked per step in seconds (issue 427). */
		timeInArea: timeInAreaOf,
		/** The ticks the ability's own damage over time deals for `seconds` in its area, if it has one. */
		areaTicks: (slot: AbilitySlot, seconds: number) => {
			const range = timeInAreaOf(slot)
			if (!input || !range) return undefined
			return areaTicks(seconds, range, {
				slot,
				effects,
				context: {
					level: input.build.level,
					ranks: input.build.ranks,
					rankStats: input.build.champion.rankStats,
				},
			})
		},
		/** What an ability's variants pick: "Lands" (Decimate), "Poisoned" (Poison Trail). */
		variantsLabel: (slot: AbilitySlot) =>
			input
				? abilityVariantsLabel({
						championKey: input.build.champion.key,
						patch: input.build.patch,
						slot,
					})
				: LANDS_LABEL,
		/** The champion's abilities as the selected form shows them. */
		spells,
		/** The champion's damage was checked on the wiki (`CURATED_COMBAT_CHAMPIONS`). */
		isCurated: champion ? isCurated(champion) : true,
		isFull: entries.length >= MAX_COMBAT_STEPS,
		add: (action: CombatAction) => saveEntries(addStep(entries, action)),
		/** Puts a marker of the effect's situation at the end, or at the start. */
		addSituation: (
			effectId: string,
			{ place = "end" }: { place?: MarkerPlace } = {},
		) =>
			saveEntries(
				insertStep(
					entries,
					{ kind: "situation", effectId },
					place === "start" ? 0 : entries.length,
				),
			),
		remove: (id: number) => save(removeEntry(value, id, effects)),
		/** Removes several entries at once (a group of steps). */
		removeAll: (ids: readonly number[]) =>
			save(ids.reduce((next, id) => removeEntry(next, id, effects), value)),
		/** Moves the entries `ids`, kept together, to position `to`. */
		move: (ids: readonly number[], to: number) =>
			saveEntries(moveEntries(entries, ids, to)),
		setWait: (id: number, seconds: number) =>
			saveEntries(setWaitSeconds(entries, id, seconds)),
		setVariant: (id: number, variant: string) =>
			saveEntries(setStepVariant(entries, id, variant, variantsOf)),
		/** Sets an ability step's seconds in its area; its full time saves as none. */
		setInArea: (id: number, seconds: number) =>
			saveEntries(setStepInArea(entries, id, seconds, timeInAreaOf)),
		setFree: (free: boolean) => save({ ...value, free }),
		/** Sets an outcome at a step in free mode; `undefined` goes back to the computed one. */
		setChoice: (id: number, outcome: string, happened: boolean | undefined) =>
			save({
				...value,
				choices: setFreeChoice(value.choices, id, outcome, happened),
			}),
		/** Free mode back to the computed outcomes. */
		restore: () => save({ ...value, choices: {} }),
		clear: () =>
			save({ ...EMPTY_COMBAT, free: value.free, onCooldown: value.onCooldown }),
		/** Puts back a value saved before (undo). */
		replace: (next: CombatState) => save(next),
	}
}
