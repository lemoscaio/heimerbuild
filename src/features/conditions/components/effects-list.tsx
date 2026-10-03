import { cva } from "class-variance-authority"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { Switch } from "@/components/ui/switch"
import type { Condition } from "../lib/conditions"
import { type EffectCard as Card, effectCards } from "../lib/effect-cards"
import {
	conditionText,
	grantText,
	partLabel,
	stackedOutText,
} from "../lib/effect-text"

type EffectsListProps = {
	/** The build's conditional effects; nothing shows without any. */
	conditions: readonly Condition[]
	onToggle: (id: string, on: boolean) => void
}

/** Under the stats: the build's conditional effects, one card per source, each part with its switch. */
export function EffectsList({ conditions, onToggle }: EffectsListProps) {
	const headingId = useId()
	if (!conditions.length) return null

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
					<EffectCard key={card.key} card={card} onToggle={onToggle} />
				))}
			</ul>
		</section>
	)
}

type EffectCardProps = {
	card: Card
	onToggle: (id: string, on: boolean) => void
}

function EffectCard({ card, onToggle }: EffectCardProps) {
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
						titleId={titleId}
						onToggle={(on) => onToggle(condition.effect.id, on)}
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

type EffectRowProps = {
	condition: Condition
	/** The card's title, which starts the switch's name. */
	titleId: string
	onToggle: (on: boolean) => void
}

function EffectRow({ condition, titleId, onToggle }: EffectRowProps) {
	const partId = useId()
	const whenId = useId()
	const valuesId = useId()
	const reasonId = useId()
	const { isOn, grants } = condition
	const part = partLabel(condition)
	const reason = stackedOutText(condition)
	const isApplied = isOn && !reason

	return (
		<div className={effectRow({ stackedOut: !!reason })}>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
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
					{grants.map(grantText).join(" · ")}
				</span>
				{reason && (
					<span id={reasonId} className="text-warning">
						{reason}
					</span>
				)}
			</span>
			<Switch
				checked={isOn}
				onCheckedChange={onToggle}
				disabled={!!reason}
				aria-labelledby={[titleId, part && partId, whenId]
					.filter(Boolean)
					.join(" ")}
				aria-describedby={[reason && reasonId, valuesId]
					.filter(Boolean)
					.join(" ")}
			/>
		</div>
	)
}
