import {
	ABILITY_SLOTS,
	type AbilitySlot,
	type ChampionSpell,
} from "@schemas/champion"
import { cva } from "class-variance-authority"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/cn"
import type { SkillPoint } from "../lib/skill-history"

export const orderCellVariants = cva(
	"flex h-9 items-center justify-center rounded-md border font-bold font-display text-xs",
	{
		variants: {
			state: {
				picked: "border-gold bg-gold text-surface-sunken",
				auto: "border-gold border-dashed text-gold",
				kept: "border-line-strong border-dashed text-subtle",
				future: "border-line/60 font-normal text-subtle/60",
			},
		},
	},
)

type SkillOrderCellProps = {
	level: number
	point: SkillPoint
	spells: readonly ChampionSpell[]
	canPlace: (slot: AbilitySlot) => boolean
	onPlace: (slot: AbilitySlot) => void
}

/** A level of the order: opens a choice of the four abilities for that level's point. */
export function SkillOrderCell({
	level,
	point,
	spells,
	canPlace,
	onPlace,
}: SkillOrderCellProps) {
	const [open, setOpen] = useState(false)

	function choose(slot: AbilitySlot) {
		onPlace(slot)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label={`Level ${level}: ${point.slot}, ${point.isAuto ? "automatic" : "picked"}. Change`}
				className={cn(
					orderCellVariants({ state: point.isAuto ? "auto" : "picked" }),
					"w-full hover:brightness-110",
				)}
			>
				{point.slot}
			</PopoverTrigger>
			<PopoverContent className="w-56">
				<PopoverTitle>Level {level} point</PopoverTitle>
				<div className="mt-1 flex flex-col gap-1">
					{ABILITY_SLOTS.map((slot) => {
						const spell = spells.find((candidate) => candidate.slot === slot)
						return (
							<Button
								key={slot}
								type="button"
								variant={slot === point.slot ? "secondary" : "ghost"}
								size="sm"
								aria-pressed={slot === point.slot}
								disabled={slot !== point.slot && !canPlace(slot)}
								focusableWhenDisabled
								className="justify-start"
								onClick={() => choose(slot)}
							>
								<span className="w-4 font-bold font-display">{slot}</span>
								<span className="truncate">{spell?.name}</span>
							</Button>
						)
					})}
				</div>
			</PopoverContent>
		</Popover>
	)
}
