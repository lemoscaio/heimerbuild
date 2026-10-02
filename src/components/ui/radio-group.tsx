import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@/lib/cn"

/** Arrow keys move between the items, Tab enters and leaves the group as one stop. */
export function RadioGroup<Value>({
	className,
	...props
}: RadioGroupPrimitive.Props<Value>) {
	return (
		<RadioGroupPrimitive
			data-slot="radio-group"
			className={cn("flex items-center", className)}
			{...props}
		/>
	)
}

/** An unstyled radio (a `<span>`, so it opts out of the text cursor): style the checked state with `data-checked:`. */
export function RadioGroupItem<Value>({
	className,
	...props
}: RadioPrimitive.Root.Props<Value>) {
	return (
		<RadioPrimitive.Root
			data-slot="radio-group-item"
			className={cn(
				"cursor-default select-none outline-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-disabled:pointer-events-none data-disabled:opacity-40",
				className,
			)}
			{...props}
		/>
	)
}
