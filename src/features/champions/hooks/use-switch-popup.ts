import { useState } from "react"

/** The champion picker's open state; a pick closes it, then switches. */
export function useSwitchPopup(onSwitch: (championKey: string) => void) {
	const [open, setOpen] = useState(false)

	return {
		open,
		setOpen,
		pick(championKey: string) {
			setOpen(false)
			onSwitch(championKey)
		},
	}
}
