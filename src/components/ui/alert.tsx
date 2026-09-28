import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const alertVariants = cva(
	"group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg:not([class*='size-'])]:size-4 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current",
	{
		variants: {
			variant: {
				default: "bg-card text-card-foreground",
				warning:
					"border-warning/40 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/90",
				destructive:
					"bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
)

/** `role="alert"` by default; pass another role when a surrounding live region already announces it. */
export function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	)
}

export function AlertTitle({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-title"
			className={cn(
				"font-medium group-has-[>svg]/alert:col-start-2",
				className,
			)}
			{...props}
		/>
	)
}

export function AlertDescription({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-description"
			className={cn(
				"text-balance text-muted-foreground text-sm group-has-[>svg]/alert:col-start-2 md:text-pretty",
				className,
			)}
			{...props}
		/>
	)
}
