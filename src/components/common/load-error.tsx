import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type LoadErrorProps = {
	onRetry: () => void
} & React.ComponentProps<"div">

/** An alert with the failure message (children) and a button that retries the load. */
export function LoadError({
	onRetry,
	children,
	className,
	...props
}: LoadErrorProps) {
	return (
		<div
			role="alert"
			className={cn(
				"flex flex-col items-center justify-center gap-5 text-center text-white",
				className,
			)}
			{...props}
		>
			<p>{children}</p>
			<Button size="lg" onClick={onRetry}>
				Try again
			</Button>
		</div>
	)
}
