import { useLocation } from "@tanstack/react-router"
import { bugReportUrl } from "@/lib/bug-report"
import { cn } from "@/lib/cn"

/** Follows the current page, so a report links the build being looked at. */
function useBugReportUrl() {
	const href = useLocation({ select: (location) => location.href })
	return bugReportUrl(new URL(href, window.location.origin))
}

export function BugReportLink({
	className,
	children = "Report a wrong number",
	...props
}: React.ComponentProps<"a">) {
	const href = useBugReportUrl()

	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className={cn(
				"text-lilac underline underline-offset-2 hover:text-white",
				className,
			)}
			{...props}
		>
			{children}
		</a>
	)
}
