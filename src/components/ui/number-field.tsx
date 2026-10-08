import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type NumberFieldProps = {
	/** Names the input; the buttons are "Decrease <label>" and "Increase <label>". */
	label: string
	/** Classes for the input itself (a wider one for 4-digit values). */
	inputClassName?: string
} & NumberFieldPrimitive.Root.Props

/** A number input between − and + buttons; arrow keys step it, and typing a number sets it. */
export function NumberField({
	label,
	inputClassName,
	className,
	...props
}: NumberFieldProps) {
	return (
		<NumberFieldPrimitive.Root
			data-slot="number-field"
			className={cn("flex", className)}
			{...props}
		>
			<NumberFieldPrimitive.Group className="flex items-center gap-1">
				<NumberFieldPrimitive.Decrement
					aria-label={`Decrease ${label}`}
					render={<Button variant="secondary" size="icon-sm" />}
				>
					<Minus />
				</NumberFieldPrimitive.Decrement>
				<NumberFieldPrimitive.Input
					aria-label={label}
					className={cn(
						"h-7 w-10 rounded-md border border-field-border bg-input/30 text-center text-sm text-white tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1",
						inputClassName,
					)}
				/>
				<NumberFieldPrimitive.Increment
					aria-label={`Increase ${label}`}
					render={<Button variant="secondary" size="icon-sm" />}
				>
					<Plus />
				</NumberFieldPrimitive.Increment>
			</NumberFieldPrimitive.Group>
		</NumberFieldPrimitive.Root>
	)
}
