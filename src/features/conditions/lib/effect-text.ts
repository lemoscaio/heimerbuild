import { STAT_UNITS, type StatKey } from "@schemas/item"
import type { EffectCondition } from "@/lib/effects/effect"
import type { ResolvedGrant, StatBasis } from "@/lib/effects/evaluate"
import { itemStatLines } from "@/lib/item-stats"
import { formatStat, statDisplay } from "@/lib/stat-display"
import type { Condition } from "./conditions"

const CONDITION_TEXT = {
	"not-damaged-recently": "Not hit by a champion or turret for 5 s",
} as const satisfies Record<EffectCondition, string>

/** How long it holds: its seconds, or its attacks within them ("For 2 attacks within 4 s"). */
type Lasting = { duration: number | undefined; charges: number | undefined }

function lasting({ duration, charges }: Lasting, when: string) {
	if (duration !== undefined && charges !== undefined) {
		return `For ${charges} attacks within ${duration} s ${when}`
	}
	if (duration !== undefined) return `For ${duration} s ${when}`
	return `${when.charAt(0).toUpperCase()}${when.slice(1)}`
}

/** Whether a grant ends on its own clock, so the row says each grant's duration instead of one. */
function hasGrantDurations({ grants, duration }: Condition): boolean {
	return grants.some(({ timing }) => {
		const seconds = timing?.duration
		return seconds !== undefined && seconds !== duration
	})
}

/**
 * When the effect holds: "For 10 s after casting", "For 2.5 s after 3 hits", "While in this form";
 * "After casting" when its grants last different times (the values say each).
 */
export function conditionText(condition: Condition): string {
	const { effect } = condition
	const { trigger, form, stacks, charges } = effect.effect
	const seconds = hasGrantDurations(condition) ? undefined : condition.duration
	const duration = { duration: seconds, charges }
	switch (trigger.kind) {
		case "always":
			return form ? "While in this form" : "Always"
		case "while":
			return CONDITION_TEXT[trigger.condition]
		case "after-use":
			return lasting(duration, "after casting")
		case "after-summoner":
			return lasting(
				duration,
				`after casting ${effect.spell?.name ?? "a summoner spell"}`,
			)
		case "on-hit":
			return lasting(duration, stacks ? `after ${stacks.max} hits` : "on hit")
		case "after-ability":
			return lasting(duration, "after an ability")
		case "on-attack":
			return lasting(duration, "after an attack")
		case "on-cast":
			return lasting(duration, "after casting")
		case "on-mark-consumed":
			return lasting(duration, "after consuming a mark")
		case "periodic":
			return lasting(duration, "periodically")
		case "on-ability-damage":
			return lasting(duration, "after ability damage")
	}
}

const PART_LABEL = { passive: "Passive", active: "Active" } as const

/** The row's label in its card: its own ("Rev'd up"), the ability's part ("Passive") or its form ("Dragon"). */
export function partLabel({ effect }: Condition): string | undefined {
	const { label, part } = effect.effect
	return label ?? (part && PART_LABEL[part]) ?? effect.formName
}

/** Why a row's switch is off limits: "Replaced by the active". */
export function stackedOutText({
	stackedOutBy,
}: Condition): string | undefined {
	if (!stackedOutBy) return undefined
	const winner = stackedOutBy.effect.part ?? stackedOutBy.name
	return `Replaced by the ${winner}`
}

/**
 * The stat a bonus reads: "30% of Armor", "7.5% of bonus Attack Damage"; a percent bonus per 100
 * of a flat stat, "2% per 100 Ability Power".
 */
function basisText({ stat, ratio, part }: StatBasis, granted: StatKey) {
	const label = part
		? `${part} ${statDisplay[stat].label}`
		: statDisplay[stat].label
	return STAT_UNITS[granted] === "percent"
		? `${formatStat(ratio * 100, "percent")} per 100 ${label}`
		: `${formatStat(ratio, "percent")} of ${label}`
}

/** What a grant gives, as shown: "+35.3% Move Speed", "+12 Armor (30% of Armor)", "+20% total Attack Speed", "269 shield". */
export function grantText(grant: ResolvedGrant): string {
	switch (grant.kind) {
		case "stat": {
			const [line] = itemStatLines({ [grant.stat]: grant.value })
			if (!line) return ""
			const text = `${line.value} ${line.label}`
			return grant.basis
				? `${text} (${basisText(grant.basis, grant.stat)})`
				: text
		}
		case "attackSpeedMultiplier": {
			const percent = formatStat(Math.abs(grant.value), "percent")
			const sign = grant.value < 0 ? "−" : "+"
			return `${sign}${percent} ${grant.of} Attack Speed`
		}
		case "shield":
		case "heal":
			return `${Math.round(grant.value)} ${grant.kind}`
	}
}

/** A grant's value without its stat's name: "10%", "282". */
function amountText(grant: ResolvedGrant, value: number): string {
	switch (grant.kind) {
		case "stat":
			return formatStat(value, STAT_UNITS[grant.stat])
		case "attackSpeedMultiplier":
			return formatStat(Math.abs(value), "percent")
		case "shield":
		case "heal":
			return String(Math.round(value))
	}
}

type TimingOptions = {
	/** The effect's seconds, which a grant without its own lasts. */
	duration?: number
	/** The row says each grant's duration. */
	perGrant: boolean
}

/**
 * A grant's own clock, as shown after its value: "for 2.5 s", "decaying over 1.5 s", "decaying to
 * 10% over 2.9 s"; a decay over the effect's whole duration is just "decaying".
 */
function timingText(
	grant: ResolvedGrant,
	{ duration, perGrant }: TimingOptions,
): string {
	const seconds = grant.timing?.duration ?? duration
	const decay = grant.timing?.decay
	const lasts =
		perGrant && seconds !== undefined && seconds !== decay?.over
			? `for ${seconds} s`
			: undefined
	const showsOver =
		decay?.over !== undefined && (perGrant || decay.over !== duration)
	const decaying =
		decay &&
		[
			"decaying",
			decay.to !== 0 && `to ${amountText(grant, decay.to)}`,
			showsOver && `over ${decay.over} s`,
		]
			.filter(Boolean)
			.join(" ")
	return [lasts, decaying].filter(Boolean).join(", ")
}

/** An effect's shield parts (Iron Mantle's base and ratios) add up to one shield; heals alike. */
function totalOutputs(grants: readonly ResolvedGrant[]): ResolvedGrant[] {
	const merged: ResolvedGrant[] = []
	for (const grant of grants) {
		const isOutput = grant.kind === "shield" || grant.kind === "heal"
		const total = isOutput && merged.find(({ kind }) => kind === grant.kind)
		if (total) total.value += grant.value
		else merged.push({ ...grant })
	}
	return merged
}

function grantsText(grants: readonly ResolvedGrant[], options: TimingOptions) {
	return totalOutputs(grants)
		.map((grant) =>
			[grantText(grant), timingText(grant, options)].filter(Boolean).join(" "),
		)
		.join(" · ")
}

/**
 * What the row's effect gives, from when it grows and what raises it: "+24 Ability Power (next: +48
 * Ability Power at 30 min)", "+60% Move Speed · boosted by GNAR! (R2)", and each grant's own
 * duration when they differ: "+80% Attack Speed for 5 s · 282 shield for 2.5 s".
 */
export function valuesText(condition: Condition): string {
	const { grants, next, boostedBy = [], duration } = condition
	const options = { duration, perGrant: hasGrantDurations(condition) }
	const now = grantsText(grants, options)
	const value = next
		? `${now} (next: ${grantsText(next.grants, options)} at ${next.gameTime} min)`
		: now
	const boosts = boostedBy.map(
		({ name, slot, rank }) => `boosted by ${name} (${slot}${rank})`,
	)
	return [value, ...boosts].join(" · ")
}
