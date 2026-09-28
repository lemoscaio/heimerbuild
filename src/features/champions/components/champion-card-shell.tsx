import { Card } from "@/components/ui/card"
import { cn } from "@/lib/cn"

/** The card frame, shared with the loading placeholders so both keep the same size. */
export function ChampionCardShell({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<Card
			size="sm"
			className={cn(
				"w-20 items-center gap-1.5 rounded-lg bg-primary-0 px-0.5 py-2 ring-primary-1/50",
				className,
			)}
			{...props}
		/>
	)
}
