import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/cn"

export function Input({
	className,
	type,
	...props
}: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"h-8 w-full min-w-0 rounded-lg border border-field-border bg-input/30 px-2.5 py-1 text-base transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/80 disabled:opacity-50 aria-invalid:border-destructive/50 aria-invalid:ring-3 aria-invalid:ring-destructive/40 md:text-sm",
				className,
			)}
			{...props}
		/>
	)
}
