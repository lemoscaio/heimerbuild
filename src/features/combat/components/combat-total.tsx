import { useId } from "react"
import { cn } from "@/lib/cn"

type CombatTotalProps = {
	term: string
	children: React.ReactNode
	/** More about the value, in small text under it (the damage by type). */
	details?: React.ReactNode
} & React.ComponentProps<"fieldset">

/** One figure of the combo's result, a group named by its term: the term over its value. */
export function CombatTotal({
	term,
	children,
	details,
	className,
	...props
}: CombatTotalProps) {
	const termId = useId()
	return (
		<fieldset
			aria-labelledby={termId}
			className={cn(
				"flex min-w-0 flex-col gap-0.5 rounded-lg bg-surface-sunken px-3 py-2",
				className,
			)}
			{...props}
		>
			<dl className="flex flex-col gap-0.5">
				<dt id={termId} className="text-subtle text-xs">
					{term}
				</dt>
				<dd className="font-bold font-display text-lg text-white tabular-nums">
					{children}
				</dd>
			</dl>
			{details}
		</fieldset>
	)
}
