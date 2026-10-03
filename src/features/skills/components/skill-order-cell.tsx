import {
	ABILITY_SLOTS,
	type AbilitySlot,
	type ChampionSpell,
} from "@schemas/champion"
import { cva } from "class-variance-authority"
import { CircleMinus } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/cn"
import { removeBlockerMessage } from "../lib/remove-blocker-message"
import type { LevelPoint, RemoveBlocker } from "../lib/skill-history"

export const orderCellVariants = cva(
	"flex h-9 items-center justify-center rounded-md border font-bold font-display text-xs",
	{
		variants: {
			state: {
				spent: "border-gold bg-gold text-surface-sunken",
				suggested: "border-gold border-dashed text-gold",
				free: "border-line-strong font-normal text-subtle hover:border-lilac hover:text-white",
				unspent: "border-line font-normal text-subtle",
				kept: "border-line-strong border-dashed text-subtle",
				future: "border-line/60 font-normal text-subtle/60",
			},
		},
	},
)

/** A level whose point can be chosen: a spent one or an unspent one. */
export type EditableLevelPoint = Extract<
	LevelPoint,
	{ state: "spent" | "free" }
>

type SkillOrderCellProps = {
	point: EditableLevelPoint
	spells: readonly ChampionSpell[]
	canPlace: (slot: AbilitySlot) => boolean
	onPlace: (slot: AbilitySlot) => void
	/** Why a spent point cannot be removed: a later point needs it. */
	removeBlocker: RemoveBlocker | undefined
	onRemove: () => void
}

/** A level of the order: opens a choice of the four abilities for that level's point, or its removal. */
export function SkillOrderCell({
	point,
	spells,
	canPlace,
	onPlace,
	removeBlocker,
	onRemove,
}: SkillOrderCellProps) {
	const [open, setOpen] = useState(false)
	const chosen = point.state === "spent" ? point.slot : undefined
	const suggestion = point.state === "free" ? point.suggestion : undefined

	function choose(slot: AbilitySlot) {
		onPlace(slot)
		setOpen(false)
	}

	function remove() {
		onRemove()
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label={triggerLabel(point)}
				className={cn(
					orderCellVariants({
						state: chosen ? "spent" : suggestion ? "suggested" : "free",
					}),
					"w-full hover:brightness-110",
				)}
			>
				{chosen ?? suggestion ?? point.level}
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
				{!!chosen && (
					<RemovePointButton blocker={removeBlocker} onRemove={remove} />
				)}
			</PopoverContent>
		</Popover>
	)
}

/** Removes the level's point, leaving it unspent; disabled with the reason when a later point needs it. */
function RemovePointButton({
	blocker,
	onRemove,
}: {
	blocker: RemoveBlocker | undefined
	onRemove: () => void
}) {
	const reasonId = useId()

	return (
		<div className="mt-1 flex flex-col gap-1 border-line border-t pt-1.5">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={!!blocker}
				focusableWhenDisabled
				aria-describedby={blocker ? reasonId : undefined}
				className="justify-start data-disabled:cursor-not-allowed data-disabled:opacity-40"
				onClick={onRemove}
			>
				<CircleMinus aria-hidden="true" />
				Remove point
			</Button>
			{!!blocker && (
				<p id={reasonId} className="text-prose">
					{removeBlockerMessage(blocker)}
				</p>
			)}
		</div>
	)
}

function triggerLabel(point: EditableLevelPoint) {
	if (point.state === "spent") {
		return `Level ${point.level}: ${point.slot}, spent. Change or remove`
	}
	const hint = point.suggestion ? `, suggested ${point.suggestion}` : ""
	return `Level ${point.level}: point to spend${hint}. Choose`
}
