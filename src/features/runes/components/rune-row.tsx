import type { Rune } from "@schemas/rune"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/cn"

type RuneRowProps = {
	/** Accessible name of the row, such as "Sorcery keystone". */
	label: string
	runes: readonly Rune[]
	value: number | undefined
	onValueChange: (runeId: number) => void
	/** Hover or focus on a rune: the page shows its details. */
	onDescribe: (rune: Rune) => void
	size?: "keystone" | "rune"
	className?: string
}

/** One row of the rune page: pick one rune (radio group, arrow keys move). */
export function RuneRow({
	label,
	runes,
	value,
	onValueChange,
	onDescribe,
	size = "rune",
	className,
}: RuneRowProps) {
	const id = useId()

	return (
		<RadioGroup
			aria-label={label}
			value={value ?? null}
			onValueChange={(runeId) => {
				if (runeId !== null) onValueChange(runeId)
			}}
			className={cn(
				"gap-4",
				{ "gap-3 lg:gap-5.5": size === "rune" },
				className,
			)}
		>
			{runes.map((rune) => (
				<RadioGroupItem
					key={rune.id}
					value={rune.id}
					aria-label={rune.name}
					aria-describedby={`${id}-${rune.id}`}
					onPointerEnter={() => onDescribe(rune)}
					onFocus={() => onDescribe(rune)}
					className={cn(
						"group/rune relative shrink-0 rounded-full border-2 border-primary-2 p-0.5 opacity-55 transition hover:opacity-90 data-checked:border-(--tree) data-checked:opacity-100",
						{
							"size-12 lg:size-12.5": size === "keystone",
							"size-11 lg:size-10": size === "rune",
						},
					)}
				>
					<GameIcon
						src={rune.icon}
						name={rune.name}
						className="size-full rounded-full bg-primary-4 grayscale group-data-checked/rune:grayscale-0"
					/>
					<span id={`${id}-${rune.id}`} hidden>
						{rune.description}
					</span>
				</RadioGroupItem>
			))}
		</RadioGroup>
	)
}
