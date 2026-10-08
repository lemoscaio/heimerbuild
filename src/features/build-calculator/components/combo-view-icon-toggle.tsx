import { Maximize2, Minimize2 } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import type { BuildView } from "../lib/build-search"

type ComboViewIconToggleProps = {
	view: BuildView
	onViewChange: (view: BuildView) => void
} & Omit<
	React.ComponentProps<typeof IconButton>,
	"label" | "onClick" | "children"
>

/** The overview / expanded combo switch as an icon button, for the Combo tab's header. */
export function ComboViewIconToggle({
	view,
	onViewChange,
	...props
}: ComboViewIconToggleProps) {
	const isCombo = view === "combo"

	return (
		<IconButton
			label={isCombo ? "Collapse combo" : "Expand combo"}
			onClick={() => onViewChange(isCombo ? "overview" : "combo")}
			{...props}
		>
			{isCombo ? (
				<Minimize2 aria-hidden="true" />
			) : (
				<Maximize2 aria-hidden="true" />
			)}
		</IconButton>
	)
}
