import { Link } from "@tanstack/react-router"
// A separate file: inlined, it would add 4.7 kB to the bundle that every page loads.
import heimerLogo from "@/assets/images/heimerdinger-logo.webp?no-inline"
import { PRODUCT_NAME } from "@/lib/product-name"

export function Header() {
	return (
		<header className="fixed z-10 flex h-header w-full items-center justify-between bg-primary-4 px-8 text-white shadow-black/40 shadow-md">
			<Link
				to="/"
				className="transition-transform duration-100 hover:-rotate-2"
			>
				Back
			</Link>
			<Link to="/" className="h-full p-2.5">
				<img
					className="size-full transition-transform duration-100 hover:-rotate-3"
					src={heimerLogo}
					alt={`${PRODUCT_NAME} home`}
				/>
			</Link>
			{/* Third flex slot keeps the logo centred between the edges. */}
			<div />
		</header>
	)
}
