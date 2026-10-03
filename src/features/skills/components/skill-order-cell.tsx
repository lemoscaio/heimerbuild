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
import type { LevelPoint } from "../lib/skill-history"

export const orderCellVariants = cva(
	"flex h-9 items-center justify-center rounded-md border font-bold font-display text-xs",
	{
		variants: {
			state: {
				spent: "border-gold bg-gold text-surface-sunken",
				suggested: "border-gold border-dashed text-gold",
				next: "border-lilac text-lilac",
				unspent: "border-line font-normal text-subtle",
				kept: "border-line-strong border-dashed text-subtle",
				future: "border-line/60 font-normal text-subtle/60",
			},
		},
	},
)

/** A level whose point can be chosen: a spent one, or the next to spend. */
export type EditableLevelPoint = Extract<
	LevelPoint,
	{ state: "spent" | "next" }
>

type SkillOrderCellProps = {
	point: EditableLevelPoint
	spells: readonly ChampionSpell[]
	canPlace: (slot: AbilitySlot) => boolean
	onPlace: (slot: AbilitySlot) => void
}

/** A level of the order: opens a choice of the four abilities for that level's point. */
export function SkillOrderCell({
	point,
	spells,
	canPlace,
	onPlace,
}: SkillOrderCellProps) {
	const [open, setOpen] = useState(false)
	const chosen = point.state === "spent" ? point.slot : undefined
	const suggestion = point.state === "next" ? point.suggestion : undefined

	function choose(slot: AbilitySlot) {
		onPlace(slot)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label={triggerLabel(point)}
				className={cn(
					orderCellVariants({
						state: chosen ? "spent" : suggestion ? "suggested" : "next",
					}),
					"w-full hover:brightness-110",
				)}
			>
				{chosen ?? suggestion ?? "+"}
			</PopoverTrigger>
			<PopoverContent className="w-56">
				<PopoverTitle>Level {point.level} point</PopoverTitle>
				<div className="mt-1 flex flex-col gap-1">
					{ABILITY_SLOTS.map((slot) => {
						const spell = spells.find((candidate) => candidate.slot === slot)
						return (
							<Button
								key={slot}
								type="button"
								variant={slot === chosen ? "secondary" : "ghost"}
								size="sm"
								aria-pressed={slot === chosen}
								disabled={slot !== chosen && !canPlace(slot)}
								focusableWhenDisabled
								// Focusable when disabled drops the `disabled` attribute: style the state.
								className="justify-start data-disabled:cursor-not-allowed data-disabled:opacity-40"
								onClick={() => choose(slot)}
							>
								<span className="w-4 font-bold font-display">{slot}</span>
								<span className="truncate">{spell?.name}</span>
								{slot === suggestion && (
									<span className="ml-auto text-gold text-xs">Suggested</span>
								)}
							</Button>
						)
					})}
				</div>
			</PopoverContent>
		</Popover>
	)
}

function triggerLabel(point: EditableLevelPoint) {
	if (point.state === "spent") {
		return `Level ${point.level}: ${point.slot}, spent. Change`
	}
	const hint = point.suggestion ? `, suggested ${point.suggestion}` : ""
	return `Level ${point.level}: point to spend${hint}. Choose`
}
