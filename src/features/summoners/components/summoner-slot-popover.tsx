import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { SpellRuneEffectsById } from "@/lib/summoner-rune-interactions"
import type { SummonerSlot } from "@/lib/summoner-slots"
import { useSlotPicker } from "../hooks/use-slot-picker"
import type { Summoners } from "../hooks/use-summoners"
import { summonerSlotName } from "../lib/summoner-picks"
import { SummonerSlotButton } from "./summoner-slot-button"
import { SummonerSpellPicker } from "./summoner-spell-picker"

type SummonerSlotPopoverProps = {
	slot: SummonerSlot
	summoners: Summoners
	spellEffects: SpellRuneEffectsById
}

/** A slot whose picker opens as a popover under it (desktop). */
export function SummonerSlotPopover({
	slot,
	summoners,
	spellEffects,
}: SummonerSlotPopoverProps) {
	const picker = useSlotPicker(summoners, slot)

	return (
		<Popover open={picker.open} onOpenChange={picker.setOpen}>
			<PopoverTrigger
				render={
					<SummonerSlotButton slotIndex={slot} spell={summoners.slots[slot]} />
				}
			/>
			<PopoverContent
				side="bottom"
				align="start"
				className="w-86 gap-0 rounded-xl border-lilac bg-surface p-3"
			>
				<SummonerSpellPicker
					title={
						<PopoverTitle className="font-bold font-display text-sm text-white">
							{summonerSlotName(slot)}
						</PopoverTitle>
					}
					slot={slot}
					summoners={summoners}
					spellEffects={spellEffects}
					onPick={picker.pick}
					onClear={picker.clear}
					anchor="top"
				/>
			</PopoverContent>
		</Popover>
	)
}
