import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/cn"

type CombatFreeModeSwitchProps = {
	checked: boolean
	onCheckedChange: (checked: boolean) => void
} & Omit<React.ComponentProps<"div">, "onChange">

/** "Free mode": off, the rules compute everything; on, each outcome can be set and nothing waits for a cooldown. */
export function CombatFreeModeSwitch({
	checked,
	onCheckedChange,
	className,
	...props
}: CombatFreeModeSwitchProps) {
	const switchId = useId()
	const hintId = useId()
	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs max-lg:min-h-11",
				{ "border-lilac bg-surface-raised": checked },
				className,
			)}
			{...props}
		>
			<Switch
				id={switchId}
				checked={checked}
				onCheckedChange={onCheckedChange}
				aria-describedby={hintId}
			/>
			<label
				htmlFor={switchId}
				className="cursor-pointer whitespace-nowrap font-semibold"
			>
				Free mode
			</label>
			<span id={hintId} className="text-subtle max-sm:sr-only">
				{checked
					? "your choices stay when you switch"
					: "strict: the rules go on from each marker"}
			</span>
		</div>
	)
}
