/** Reserves the runes spot in the workbench until runes ship. */
export function RunesPlaceholder() {
	return (
		<section
			aria-labelledby="runes-placeholder-title"
			className="flex flex-col gap-1 rounded-xl border border-primary-1 border-dashed bg-primary-4 p-4 max-lg:hidden"
		>
			<h2
				id="runes-placeholder-title"
				className="font-display font-semibold text-lilac text-sm"
			>
				Runes
			</h2>
			<p className="text-subtle text-xs">Coming soon</p>
		</section>
	)
}
