import { CircleAlert } from "lucide-react"
import { cn } from "@/lib/cn"

type CombatUncuratedNoteProps = {
	championName: string
} & React.ComponentProps<"p">

/** For a champion off the curated list: its numbers aren't checked against the wiki yet. */
export function CombatUncuratedNote({
	championName,
	className,
	...props
}: CombatUncuratedNoteProps) {
	return (
		<p
			className={cn(
				"flex items-start gap-2 rounded-lg border border-line-strong p-3 text-prose text-xs leading-snug",
				className,
			)}
			{...props}
		>
			<CircleAlert
				aria-hidden="true"
				className="mt-0.5 size-3.5 shrink-0 text-warning"
			/>
			{championName}'s damage isn't checked against the wiki yet: abilities the
			combo can't count are marked "Not modeled", and their hits show why.
		</p>
	)
}
