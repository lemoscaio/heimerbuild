import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/cn"
import type { CombatStartOption } from "../lib/combat-start"

type CombatStartControlProps = {
	options: readonly CombatStartOption[]
	onOptionChange: (id: string, on: boolean) => void
} & React.ComponentProps<"section">

/** "Starting situation": what the combo starts with, one switch per situation the build supports. */
export function CombatStartControl({
	options,
	onOptionChange,
	className,
	...props
}: CombatStartControlProps) {
	const titleId = useId()
	if (!options.length) return null

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col gap-1", className)}
			{...props}
		>
			<h3 id={titleId} className="font-bold font-display text-sm">
				Starting situation
			</h3>
			<ul className="flex flex-wrap gap-x-4 gap-y-1">
				{options.map((option) => (
					<StartOptionSwitch
						key={option.id}
						option={option}
						onCheckedChange={(on) => onOptionChange(option.id, on)}
					/>
				))}
			</ul>
		</section>
	)
}

function StartOptionSwitch({
	option,
	onCheckedChange,
}: {
	option: CombatStartOption
	onCheckedChange: (on: boolean) => void
}) {
	const switchId = useId()
	return (
		<li className="flex items-center gap-2 text-prose text-xs max-lg:min-h-11">
			<Switch
				id={switchId}
				checked={option.on}
				onCheckedChange={onCheckedChange}
			/>
			<label htmlFor={switchId} className="cursor-pointer">
				{option.label}
			</label>
		</li>
	)
}
