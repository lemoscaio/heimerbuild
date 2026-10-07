import type { CombatTarget } from "@/lib/combat/combat"

/** The target's numbers the user sets; its level follows the build's. */
export type TargetStats = Pick<CombatTarget, "health" | "armor" | "magicResist">

export type TargetStat = keyof TargetStats

/** The combo's target: its numbers, absent while untouched (the default preset's). */
export type TargetValue = Partial<TargetStats>

export const TARGET_PRESETS = [
	{
		id: "dummy",
		name: "Dummy",
		stats: { health: 1800, armor: 60, magicResist: 45 },
	},
	{
		id: "squishy",
		name: "Squishy",
		stats: { health: 1300, armor: 45, magicResist: 35 },
	},
	{
		id: "bruiser",
		name: "Bruiser",
		stats: { health: 2600, armor: 110, magicResist: 70 },
	},
	{
		id: "tank",
		name: "Tank",
		stats: { health: 3800, armor: 200, magicResist: 140 },
	},
] as const satisfies readonly { id: string; name: string; stats: TargetStats }[]

export type TargetPreset = (typeof TARGET_PRESETS)[number]

export type TargetPresetId = TargetPreset["id"]

const DEFAULT_PRESET: TargetPreset = TARGET_PRESETS[0]

/** What each number may be: health from 1, resistances from 0, all whole. */
export const TARGET_STAT_RANGES = {
	health: { min: 1, max: 20_000 },
	armor: { min: 0, max: 1000 },
	magicResist: { min: 0, max: 1000 },
} as const satisfies Record<TargetStat, { min: number; max: number }>

/** A number in its stat's range, whole; anything unreadable is the stat's minimum. */
export function clampTargetStat(stat: TargetStat, value: number): number {
	const { min, max } = TARGET_STAT_RANGES[stat]
	if (!Number.isFinite(value)) return min
	return Math.min(max, Math.max(min, Math.round(value)))
}

/** The target's numbers, each from the value or else the default preset, in range. */
export function readTarget(value: TargetValue): TargetStats {
	return {
		health: clampTargetStat(
			"health",
			value.health ?? DEFAULT_PRESET.stats.health,
		),
		armor: clampTargetStat("armor", value.armor ?? DEFAULT_PRESET.stats.armor),
		magicResist: clampTargetStat(
			"magicResist",
			value.magicResist ?? DEFAULT_PRESET.stats.magicResist,
		),
	}
}

/** The preset the numbers are, if any: an edited number makes a custom target. */
export function presetOf(stats: TargetStats): TargetPreset | undefined {
	return TARGET_PRESETS.find(
		(preset) =>
			preset.stats.health === stats.health &&
			preset.stats.armor === stats.armor &&
			preset.stats.magicResist === stats.magicResist,
	)
}

const STATS_SEPARATOR = "-"

/** Reads the `target` value: a preset's id or `health-armor-magicResist`; anything else is the default. */
export function readTargetParam(value: string | undefined): TargetValue {
	const preset = TARGET_PRESETS.find(({ id }) => id === value)
	if (preset) return { ...preset.stats }
	const [health, armor, magicResist] = (value ?? "")
		.split(STATS_SEPARATOR)
		.map(Number)
	if (
		health === undefined ||
		armor === undefined ||
		magicResist === undefined ||
		![health, armor, magicResist].every(Number.isInteger)
	) {
		return {}
	}
	return readTarget({ health, armor, magicResist })
}

/** The `target` value: a preset's id (`tank`) or its numbers (`1800-60-45`); `undefined` for the default preset. */
export function toTargetParam(value: TargetValue): string | undefined {
	const stats = readTarget(value)
	const preset = presetOf(stats)
	if (preset) return preset === DEFAULT_PRESET ? undefined : preset.id
	return [stats.health, stats.armor, stats.magicResist].join(STATS_SEPARATOR)
}
