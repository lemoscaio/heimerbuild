/** Names Option 1's and 4's two number columns while the forms are compared. */
export function CompareColumnsHeader({
	comparedName,
}: {
	comparedName: string
}) {
	return (
		<div
			aria-hidden="true"
			className="-mb-2 flex gap-2 px-2 text-[0.625rem] text-subtle uppercase tracking-wider"
		>
			<span className="flex-1" />
			<span className="w-16 whitespace-nowrap text-right">
				vs {comparedName}
			</span>
			<span className="w-17.5 text-right">Total</span>
		</div>
	)
}
