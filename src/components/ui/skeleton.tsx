/** A pulsing placeholder block; hidden from assistive tech, so pair it with a status message. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			aria-hidden="true"
			className={className ? `skeleton ${className}` : "skeleton"}
			{...props}
		/>
	)
}
