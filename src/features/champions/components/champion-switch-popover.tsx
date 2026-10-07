import type { Champion } from "@schemas/champion"
import { useRef } from "react"
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import { useSwitchPopup } from "../hooks/use-switch-popup"
import { ChampionAvatarButton } from "./champion-avatar-button"
import { ChampionPicker } from "./champion-picker"

export type ChampionSwitchPopupProps = {
	champion: Pick<Champion, "key" | "name" | "icon">
	/** The selected form's name, over the portrait. */
	caption?: string
	patch: string
	/** Under the grid: what a switch keeps and resets. */
	footer?: React.ReactNode
	onSwitch: (championKey: string) => void
}

/** The champion's portrait, opening the champion picker as a popover under it (desktop). */
export function ChampionSwitchPopover({
	champion,
	caption,
	patch,
	footer,
	onSwitch,
}: ChampionSwitchPopupProps) {
	const popup = useSwitchPopup(onSwitch)
	const searchRef = useRef<HTMLInputElement>(null)

	return (
		<Popover open={popup.open} onOpenChange={popup.setOpen}>
			<PopoverTrigger
				render={
					<ChampionAvatarButton
						champion={champion}
						caption={caption}
						className="size-16 rounded-lg"
					/>
				}
			/>
			<PopoverContent
				side="bottom"
				align="start"
				initialFocus={searchRef}
				className="w-113 gap-0 rounded-xl border-lilac bg-surface p-3.5"
			>
				<ChampionPicker
					title={
						<PopoverTitle className="font-bold font-display text-sm text-white">
							Switch champion
						</PopoverTitle>
					}
					patch={patch}
					currentKey={champion.key}
					layout="popover"
					footer={footer}
					inputRef={searchRef}
					onPick={popup.pick}
				/>
			</PopoverContent>
		</Popover>
	)
}
