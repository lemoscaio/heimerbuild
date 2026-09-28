import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

export const toggleVariants = cva(
	"group/toggle inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-sm font-medium text-sm transition-colors not-data-pressed:hover:bg-primary-2 disabled:pointer-events-none disabled:opacity-50 data-pressed:inset-ring data-pressed:inset-ring-lilac data-pressed:bg-primary-1 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			size: {
				default: "h-8 min-w-8 px-2.5",
				icon: "size-7.5",
				"icon-sm": "size-6.5 p-0.75",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
)

export function Toggle({
	className,
	size = "default",
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(toggleVariants({ size, className }))}
			{...props}
		/>
	)
}
