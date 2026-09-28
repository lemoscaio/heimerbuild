import heimerdingerAnimation from "@/assets/images/heimerdinger.webp"

export function MainPageLogo() {
	return (
		<div className="logo-container">
			<img
				src={heimerdingerAnimation}
				alt="Heimerdinger"
				width={498}
				height={475}
				className="logo-container__logo"
			/>
		</div>
	)
}
