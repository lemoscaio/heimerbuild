import { Link } from "@tanstack/react-router"
// A separate file: inlined, it would add 4.7 kB to the bundle that every page loads.
import heimerLogo from "@/assets/images/heimerdinger-logo.webp?no-inline"
import { PRODUCT_NAME } from "@/lib/product-name"
import { BetaBadge } from "./beta-badge"

export function Header() {
	return (
		<header className="fixed z-10 flex h-header w-full items-center justify-between bg-surface-sunken px-8 text-white shadow-black/40 shadow-md">
			<Link
				to="/"
				className="transition-transform duration-100 hover:-rotate-2"
			>
				Back
			</Link>
			{/* The badge hangs off the logo's right edge, so the logo stays centred. */}
			<div className="relative h-full">
				<Link to="/" className="block h-full p-2.5">
					<img
						className="size-full transition-transform duration-100 hover:-rotate-3"
						src={heimerLogo}
						alt={`${PRODUCT_NAME} home`}
					/>
				</Link>
				<BetaBadge className="absolute top-1/2 left-full -translate-y-1/2" />
			</div>
			{/* Third flex slot keeps the logo centred between the edges. */}
			<div />
		</header>
	)
}
