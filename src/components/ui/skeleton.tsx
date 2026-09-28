import { cn } from "@/lib/cn"

/** A pulsing placeholder block; hidden from assistive tech, so pair it with a status message. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			aria-hidden="true"
			data-slot="skeleton"
			className={cn(
				"animate-pulse rounded-md bg-muted motion-reduce:animate-none",
				className,
			)}
			{...props}
		/>
	)
}
