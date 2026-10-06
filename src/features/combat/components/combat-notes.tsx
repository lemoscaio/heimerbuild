import { Info } from "lucide-react"
import { cn } from "@/lib/cn"

/** What the combo leaves out, said quietly under it. */
export function CombatNotes({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			aria-label="About the combo"
			className={cn("flex flex-col gap-1 text-subtle text-xs", className)}
			{...props}
		>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				Projectile travel time isn't counted.
			</li>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				The combo starts from each effect's default and ignores the stats
				panel's switches.
			</li>
		</ul>
	)
}
