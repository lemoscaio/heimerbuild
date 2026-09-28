import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import type { VariantProps } from "class-variance-authority"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/cn"

/** One tab stop for the whole group; arrow keys move between its items. */
export function ToggleGroup<Value extends string>({
	className,
	...props
}: ToggleGroupPrimitive.Props<Value>) {
	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			className={cn(
				"flex flex-row items-center gap-1 data-[orientation=vertical]:flex-col",
				className,
			)}
			{...props}
		/>
	)
}

export function ToggleGroupItem<Value extends string>({
	className,
	size = "default",
	...props
}: TogglePrimitive.Props<Value> & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive
			data-slot="toggle-group-item"
			className={cn(toggleVariants({ size }), className)}
			{...props}
		/>
	)
}
