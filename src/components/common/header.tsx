import { Link } from "@tanstack/react-router"
// A separate file: inlined, it would add 4.7 kB to the bundle that every page loads.
import heimerLogo from "@/assets/images/heimerdinger-logo.webp?no-inline"

export function Header() {
	return (
		<header className="header">
			<div className="header__link">
				<Link to="/">Back</Link>
			</div>
			<div className="header__logo-container">
				<Link to="/">
					<img
						className="header__logo"
						src={heimerLogo}
						alt="Heimerbuild home"
					/>
				</Link>
			</div>
			{/* Third flex slot keeps the logo centred between the edges. */}
			<div />
		</header>
	)
}
