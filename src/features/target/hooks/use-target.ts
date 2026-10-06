import type { CombatTarget } from "@/lib/combat/combat"
import {
	clampTargetStat,
	presetOf,
	readTarget,
	TARGET_PRESETS,
	type TargetPresetId,
	type TargetStat,
	type TargetValue,
} from "../lib/target"

type UseTargetOptions = {
	value: TargetValue
	onChange: (value: TargetValue) => void
	/** The target's level: the build's, until an opponent brings its own. */
	level: number
}

export type Target = ReturnType<typeof useTarget>

/**
 * The combo's target, a dummy that doesn't react, controlled by `value`: its health, armor and
 * magic resist, picked from a preset or set one by one. It has the opponent's shape (`CombatTarget`).
 */
export function useTarget({ value, onChange, level }: UseTargetOptions) {
	const stats = readTarget(value)

	return {
		/** What the combat simulator hits. */
		target: { ...stats, level } satisfies CombatTarget,
		/** The preset the numbers are; undefined for a custom target. */
		preset: presetOf(stats),
		presets: TARGET_PRESETS,
		setPreset(id: TargetPresetId) {
			const preset = TARGET_PRESETS.find((entry) => entry.id === id)
			if (preset) onChange({ ...preset.stats })
		},
		setStat(stat: TargetStat, next: number) {
			onChange({ ...stats, [stat]: clampTargetStat(stat, next) })
		},
	}
}
