import { PRODUCT_NAME } from "@/lib/product-name"
import { BetaBadge } from "./beta-badge"

export function AppName() {
	return (
		<div className="select-none text-center text-white">
			<div className="relative inline-block">
				<h1 className="font-logo text-6xl leading-none sm:text-8xl">
					{PRODUCT_NAME}
				</h1>
				<BetaBadge className="absolute top-0 left-full ml-1 sm:ml-2" />
			</div>
			<p className="mt-2 font-display text-lg text-subtle sm:text-xl">
				League of Legends build calculator
			</p>
		</div>
	)
}
