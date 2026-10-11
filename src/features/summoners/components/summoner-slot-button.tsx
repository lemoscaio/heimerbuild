import type { SummonerSpell } from "@schemas/summoner-spell"
import { cva } from "class-variance-authority"
import { Plus } from "lucide-react"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { SummonerSlot } from "@/lib/summoner-slots"
import { summonerSlotName } from "../lib/summoner-picks"

const slotButtonVariants = cva(
	"relative flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition after:absolute after:-inset-x-1.5 after:-inset-y-0.5 focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:size-7.5",
	{
		variants: {
			state: {
				filled:
					"border-2 border-line hover:border-lilac aria-expanded:border-lilac aria-expanded:ring-3 aria-expanded:ring-lilac/30",
				empty:
					"border-2 border-line-strong border-dashed text-subtle hover:border-lilac hover:text-lilac aria-expanded:border-lilac aria-expanded:text-lilac",
			},
		},
	},
)

type SummonerSlotButtonProps = {
	/** Which slot (the HTML `slot` attribute owns the name `slot`). */
	slotIndex: SummonerSlot
	spell: SummonerSpell | undefined
	/** The spell's upgrade, named after it ("Unleashed Smite"). */
	upgrade?: { name: string; short: string }
} & React.ComponentProps<"button">

/** A summoner spell slot by the portrait: the spell's icon, or a dashed "+" when empty. */
export function SummonerSlotButton({
	slotIndex,
	spell,
	upgrade,
	className,
	...props
}: SummonerSlotButtonProps) {
	return (
		<button
			type="button"
			aria-label={`${summonerSlotName(slotIndex)}: ${upgrade?.name ?? spell?.name ?? "empty"}`}
			className={cn(
				slotButtonVariants({ state: spell ? "filled" : "empty" }),
				className,
			)}
			{...props}
		>
			{spell ? (
				<GameIcon
					src={spell.icon}
					name={spell.name}
					className="size-full rounded-[inherit]"
				/>
			) : (
				<Plus aria-hidden="true" className="size-3.5" />
			)}
			{upgrade && (
				<span
					aria-hidden="true"
					className="absolute -right-1 -bottom-1 rounded-sm border border-gold bg-surface px-0.5 font-bold text-[8px] text-gold leading-tight"
				>
					{upgrade.short[0]}
				</span>
			)}
		</button>
	)
}
