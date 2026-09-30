import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { BuildView } from "../lib/build-search"

type ShopViewToggleProps = {
	view: BuildView
	onViewChange: (view: BuildView) => void
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "children">

/** Switches between the overview workbench and the expanded shop. */
export function ShopViewToggle({
	view,
	onViewChange,
	className,
	...props
}: ShopViewToggleProps) {
	const isShop = view === "shop"

	return (
		<Button
			type="button"
			variant="outline"
			className={cn("border-lilac bg-primary-2", className)}
			onClick={() => onViewChange(isShop ? "overview" : "shop")}
			{...props}
		>
			{isShop ? (
				<Minimize2 aria-hidden="true" />
			) : (
				<Maximize2 aria-hidden="true" />
			)}
			{isShop ? "Collapse shop" : "Expand shop"}
		</Button>
	)
}
