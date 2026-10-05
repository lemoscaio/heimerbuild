import { Ban } from "lucide-react"
import { cn } from "@/lib/cn"

/** Why the selected form can't cast an ability ("Unavailable as Mini Gnar"), as text with its icon. */
export function UnavailableReason({
	className,
	children,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("flex items-start gap-1.5 text-warning", className)}
			{...props}
		>
			<Ban aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
			{children}
		</p>
	)
}
