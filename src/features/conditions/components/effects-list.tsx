import { cva } from "class-variance-authority"
import { Fragment, useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { Switch } from "@/components/ui/switch"
import type { MatchStackSource } from "@/lib/effects/effect"
import { type Condition, stackInputRows } from "../lib/conditions"
import { type EffectCard as Card, effectCards } from "../lib/effect-cards"
import {
	conditionText,
	partLabel,
	stackedOutText,
	valuesText,
} from "../lib/effect-text"

type ConditionInputs = {
	/** The current health input (`CurrentHealthInput`), shown on the rows whose effect reads it. */
	healthInput?: React.ReactNode
	/** The game time input (`GameTimeInput`), shown on the rows whose effect reads it. */
	gameTimeInput?: React.ReactNode
	/** Each match stack source's input by source id, shown on the rows whose effect reads it. */
	stacksInputs?: Readonly<Record<string, React.ReactNode>>
}

type EffectsListProps = ConditionInputs & {
	/** The build's effects; nothing shows without any. */
	conditions: readonly Condition[]
	onToggle: (id: string, on: boolean) => void
}

/**
 * Under the stats: the build's effects, one card per source. A conditional part has its switch; an
 * always-on one only informs. A part that reads a condition value (current health, game time, match
 * stacks) carries its input.
 */
export function EffectsList({
	conditions,
	onToggle,
	...inputs
}: EffectsListProps) {
	const headingId = useId()
	if (!conditions.length) return null
	const inputRows = stackInputRows(conditions)

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-1">
			<h3
				id={headingId}
				className="font-semibold text-gold text-xs uppercase tracking-widest"
			>
				Effects
			</h3>
			<ul className="flex flex-col gap-0.5">
				{effectCards(conditions).map((card) => (
					<EffectCard
						key={card.key}
						card={card}
						inputRows={inputRows}
						onToggle={onToggle}
						{...inputs}
					/>
				))}
			</ul>
		</section>
	)
}

type EffectCardProps = ConditionInputs & {
	card: Card
	/** The stack sources whose input each row carries, by effect id. */
	inputRows: ReadonlyMap<string, readonly MatchStackSource[]>
	onToggle: (id: string, on: boolean) => void
}

function EffectCard({ card, inputRows, onToggle, ...inputs }: EffectCardProps) {
	const titleId = useId()

	return (
		<li className="flex gap-2 rounded-md bg-line/40 px-2 py-1.5 text-xs leading-4">
			<GameIcon src={card.icon} name={card.title} className="size-7 rounded" />
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span id={titleId} className="font-semibold text-white">
					{card.title}
				</span>
				{card.conditions.map((condition) => (
					<EffectRow
						key={condition.effect.id}
						condition={condition}
						inputSources={inputRows.get(condition.effect.id) ?? []}
						titleId={titleId}
						onToggle={(on) => onToggle(condition.effect.id, on)}
						{...inputs}
					/>
				))}
			</div>
		</li>
	)
}

const effectRow = cva("flex items-center gap-2 max-lg:min-h-11", {
	variants: {
		stackedOut: {
			true: "opacity-60",
			false: "",
		},
	},
})

const effectValues = cva("font-medium tabular-nums", {
	variants: {
		state: {
			applied: "text-success",
			off: "text-subtle",
		},
	},
})

type EffectRowProps = ConditionInputs & {
	condition: Condition
	/** The stack sources whose input this row carries: those no row above it carries. */
	inputSources: readonly MatchStackSource[]
	/** The card's title, which starts the row's name. */
	titleId: string
	onToggle: (on: boolean) => void
}

function EffectRow({
	condition,
	inputSources,
	titleId,
	onToggle,
	healthInput,
	gameTimeInput,
	stacksInputs,
}: EffectRowProps) {
	const partId = useId()
	const whenId = useId()
	const valuesId = useId()
	const reasonId = useId()
	const { isOn, isSwitchable } = condition
	const part = partLabel(condition)
	const reason = stackedOutText(condition)
	const isApplied = isOn && !reason
	const name = {
		"aria-labelledby": [titleId, part && partId, whenId]
			.filter(Boolean)
			.join(" "),
		"aria-describedby": [reason && reasonId, valuesId]
			.filter(Boolean)
			.join(" "),
	}

	return (
		<div
			className={effectRow({ stackedOut: !!reason })}
			// An always-on row has no switch to carry its name, so the row carries it.
			{...(!isSwitchable && { role: "group", ...name })}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{part && (
					<span id={partId} className="font-semibold text-prose">
						{part}
					</span>
				)}
				<span id={whenId} className="text-subtle">
					{conditionText(condition)}
				</span>
				<span
					id={valuesId}
					className={effectValues({ state: isApplied ? "applied" : "off" })}
				>
					{valuesText(condition)}
				</span>
				{reason && (
					<span id={reasonId} className="text-warning">
						{reason}
					</span>
				)}
				{condition.usesCurrentHealth && healthInput}
				{condition.usesGameTime && gameTimeInput}
				{inputSources.map(({ id }) => (
					<Fragment key={id}>{stacksInputs?.[id]}</Fragment>
				))}
			</div>
			{isSwitchable && (
				<Switch
					checked={isOn}
					onCheckedChange={onToggle}
					disabled={!!reason}
					{...name}
				/>
			)}
		</div>
	)
}
