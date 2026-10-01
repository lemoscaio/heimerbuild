import { PRODUCT_NAME } from "@/lib/product-name"

export function AppName() {
	return (
		<div className="select-none text-center text-white">
			<h1 className="font-logo text-6xl leading-none sm:text-8xl">
				{PRODUCT_NAME}
			</h1>
			<p className="mt-2 font-display text-lg text-subtle sm:text-xl">
				League of Legends build calculator
			</p>
		</div>
	)
}
