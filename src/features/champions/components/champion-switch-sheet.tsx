import { X } from "lucide-react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer"
import { useSwitchPopup } from "../hooks/use-switch-popup"
import { ChampionAvatarButton } from "./champion-avatar-button"
import { ChampionPicker } from "./champion-picker"
import type { ChampionSwitchPopupProps } from "./champion-switch-popover"

/** The champion's portrait, opening the champion picker as a bottom sheet (phones). */
export function ChampionSwitchSheet({
	champion,
	caption,
	patch,
	footer,
	onSwitch,
}: ChampionSwitchPopupProps) {
	const popup = useSwitchPopup(onSwitch)
	const searchRef = useRef<HTMLInputElement>(null)

	return (
		<Drawer open={popup.open} onOpenChange={popup.setOpen}>
			<DrawerTrigger
				render={
					<ChampionAvatarButton
						champion={champion}
						caption={caption}
						className="size-14 rounded-xl"
					/>
				}
			/>
			{/* A tap keeps the keyboard closed so the grid stays in view; the field is a tap away. */}
			<DrawerContent
				initialFocus={(openType) =>
					openType === "touch" ? true : searchRef.current
				}
			>
				<ChampionPicker
					title={
						<div className="flex items-center justify-between gap-2">
							<DrawerTitle>Switch champion</DrawerTitle>
							<DrawerClose
								render={
									<Button
										variant="ghost"
										size="icon"
										aria-label="Close"
										className="size-11 text-subtle"
									/>
								}
							>
								<X aria-hidden="true" />
							</DrawerClose>
						</div>
					}
					patch={patch}
					currentKey={champion.key}
					layout="sheet"
					footer={footer}
					inputRef={searchRef}
					onPick={popup.pick}
				/>
			</DrawerContent>
		</Drawer>
	)
}
