import { cva } from "class-variance-authority"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { Switch } from "@/components/ui/switch"
import type { Condition } from "../lib/conditions"
import { conditionText, grantText } from "../lib/effect-text"

type EffectsListProps = {
	/** The build's conditional effects; nothing shows without any. */
	conditions: readonly Condition[]
	onToggle: (id: string, on: boolean) => void
}

/** Under the stats: the build's conditional effects, each with its switch and what it gives. */
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
				{conditions.map((condition) => (
					<EffectRow
						key={condition.effect.id}
						condition={condition}
						onToggle={(on) => onToggle(condition.effect.id, on)}
					/>
				))}
			</ul>
		</section>
	)
}

const effectValues = cva("font-medium tabular-nums", {
	variants: {
		state: {
			on: "text-success",
			off: "text-subtle",
		},
	},
})

type EffectRowProps = {
	condition: Condition
	onToggle: (on: boolean) => void
}

function EffectRow({ condition, onToggle }: EffectRowProps) {
	const nameId = useId()
	const whenId = useId()
	const valuesId = useId()
	const { effect, isOn, grants } = condition

	return (
		<li className="flex items-center gap-2 rounded-md bg-line/40 px-2 py-1.5 text-xs leading-4 max-lg:min-h-11">
			<GameIcon
				src={effect.icon}
				name={effect.name}
				className="size-7 self-start rounded"
			/>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span id={nameId} className="font-semibold text-white">
					{effect.name}
				</span>
				<span id={whenId} className="text-subtle">
					{conditionText(condition)}
				</span>
				<span
					id={valuesId}
					className={effectValues({ state: isOn ? "on" : "off" })}
				>
					{grants.map(grantText).join(" · ")}
				</span>
			</span>
			<Switch
				checked={isOn}
				onCheckedChange={onToggle}
				aria-labelledby={`${nameId} ${whenId}`}
				aria-describedby={valuesId}
			/>
		</li>
	)
}
