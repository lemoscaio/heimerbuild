import { Maximize2, Minimize2 } from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import type { BuildView } from "../lib/build-search"

type ShopViewIconToggleProps = {
	view: BuildView
	onViewChange: (view: BuildView) => void
} & Omit<
	React.ComponentProps<typeof IconButton>,
	"label" | "onClick" | "children"
>

/** The overview / expanded shop switch as an icon button, for the shop controls row. */
export function ShopViewIconToggle({
	view,
	onViewChange,
	...props
}: ShopViewIconToggleProps) {
	const isShop = view === "shop"

	return (
		<IconButton
			label={isShop ? "Back to overview" : "Expand shop"}
			onClick={() => onViewChange(isShop ? "overview" : "shop")}
			{...props}
		>
			{isShop ? (
				<Minimize2 aria-hidden="true" />
			) : (
				<Maximize2 aria-hidden="true" />
			)}
		</IconButton>
	)
}
