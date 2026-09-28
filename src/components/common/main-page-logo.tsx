import heimerdingerAnimation from "@/assets/images/heimerdinger.webp"

export function MainPageLogo() {
	return (
		<div className="flex justify-center">
			<img
				src={heimerdingerAnimation}
				alt="Heimerdinger"
				width={498}
				height={475}
				className="h-auto w-1/2 max-w-62.5 transition-transform duration-300 hover:scale-101"
			/>
		</div>
	)
}
