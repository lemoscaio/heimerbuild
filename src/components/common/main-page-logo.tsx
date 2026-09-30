import heimerdingerAnimation from "@/assets/images/heimerdinger.webp"

/** The animated Heimerdinger under the home page title; smaller on phones so the search stays in view. */
export function MainPageLogo() {
	return (
		<img
			src={heimerdingerAnimation}
			alt="Heimerdinger"
			width={498}
			height={475}
			className="h-auto w-32 sm:w-44 lg:w-52"
		/>
	)
}
