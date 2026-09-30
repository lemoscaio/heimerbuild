import type { HTMLMotionProps, Variants } from "motion/react"
import * as m from "motion/react-m"
import { cn } from "@/lib/cn"

// Driven by ChampionListRegion's variants, which also set the timing and the stagger.
const revealVariants: Variants = {
	open: { opacity: 1, y: 0 },
	collapsed: { opacity: 0, y: 8 },
}

/** One champion card that fades and slides in when the list opens. */
export function ChampionCardReveal({
	className,
	...props
}: HTMLMotionProps<"div">) {
	return (
		<m.div
			variants={revealVariants}
			className={cn("min-w-0", className)}
			{...props}
		/>
	)
}
