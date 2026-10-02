import {
	Drawer,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer"
import type { SpellRuneEffectsById } from "@/lib/summoner-rune-interactions"
import type { SummonerSlot } from "@/lib/summoner-slots"
import { useSlotPicker } from "../hooks/use-slot-picker"
import type { Summoners } from "../hooks/use-summoners"
import { summonerSlotName } from "../lib/summoner-picks"
import { SummonerSlotButton } from "./summoner-slot-button"
import { SummonerSpellPicker } from "./summoner-spell-picker"

type SummonerSlotSheetProps = {
	slot: SummonerSlot
	summoners: Summoners
	spellEffects: SpellRuneEffectsById
}

/** A slot whose picker opens as a bottom sheet (phones). */
export function SummonerSlotSheet({
	slot,
	summoners,
	spellEffects,
}: SummonerSlotSheetProps) {
	const picker = useSlotPicker(summoners, slot)

	return (
		<Drawer open={picker.open} onOpenChange={picker.setOpen}>
			<DrawerTrigger
				render={
					<SummonerSlotButton slotIndex={slot} spell={summoners.slots[slot]} />
				}
			/>
			<DrawerContent>
				<SummonerSpellPicker
					title={<DrawerTitle>{summonerSlotName(slot)}</DrawerTitle>}
					slot={slot}
					summoners={summoners}
					spellEffects={spellEffects}
					onPick={picker.pick}
					onClear={picker.clear}
				/>
			</DrawerContent>
		</Drawer>
	)
}
