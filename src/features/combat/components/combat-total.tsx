type CombatTotalProps = {
	term: string
	children: React.ReactNode
}

/** One figure of the combo's result: its name over its value. */
export function CombatTotal({ term, children }: CombatTotalProps) {
	return (
		<div className="flex flex-col gap-0.5 rounded-lg bg-surface-sunken px-3 py-2">
			<dt className="text-subtle text-xs">{term}</dt>
			<dd className="font-bold font-display text-lg text-white tabular-nums">
				{children}
			</dd>
		</div>
	)
}
