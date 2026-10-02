import { cn } from "@/lib/cn"
import type { SpellRuneEffectsById } from "@/lib/summoner-rune-interactions"
import type { SummonerSlot } from "@/lib/summoner-slots"
import type { Summoners } from "../hooks/use-summoners"
import { SummonerSlotPopover } from "./summoner-slot-popover"
import { SummonerSlotSheet } from "./summoner-slot-sheet"

const SLOTS = [0, 1] as const satisfies readonly SummonerSlot[]

type SummonerSlotsProps = {
	summoners: Summoners
	/** Each spell's reacting runes in the current page, shown in the picker. */
	spellEffects: SpellRuneEffectsById
	/** `popover` on desktop, `sheet` (a bottom sheet) on phones. */
	layout: "popover" | "sheet"
	className?: string
}

/** The two summoner spell slots, stacked beside the champion's portrait. */
export function SummonerSlots({
	summoners,
	spellEffects,
	layout,
	className,
}: SummonerSlotsProps) {
	return (
		<fieldset
			aria-label="Summoner spells"
			className={cn("flex min-w-0 flex-col gap-1", className)}
		>
			{SLOTS.map((slot) =>
				layout === "popover" ? (
					<SummonerSlotPopover
						key={slot}
						slot={slot}
						summoners={summoners}
						spellEffects={spellEffects}
					/>
				) : (
					<SummonerSlotSheet
						key={slot}
						slot={slot}
						summoners={summoners}
						spellEffects={spellEffects}
					/>
				),
			)}
		</fieldset>
	)
}
