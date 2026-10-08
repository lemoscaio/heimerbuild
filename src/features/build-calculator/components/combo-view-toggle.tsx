import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BuildView } from "../lib/build-search"

type ComboViewToggleProps = {
	view: BuildView
	onViewChange: (view: BuildView) => void
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "children">

/** Switches between the overview workbench and the expanded combo, as the shop's switch does. */
export function ComboViewToggle({
	view,
	onViewChange,
	...props
}: ComboViewToggleProps) {
	const isCombo = view === "combo"

	return (
		<Button
			type="button"
			variant="outline"
			onClick={() => onViewChange(isCombo ? "overview" : "combo")}
			{...props}
		>
			{isCombo ? (
				<Minimize2 aria-hidden="true" />
			) : (
				<Maximize2 aria-hidden="true" />
			)}
			{isCombo ? "Collapse combo" : "Expand combo"}
		</Button>
	)
}
