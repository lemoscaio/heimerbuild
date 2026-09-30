import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/cn"

export function TooltipProvider({
	delay = 0,
	...props
}: TooltipPrimitive.Provider.Props) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delay={delay}
			{...props}
		/>
	)
}

export function Tooltip<Payload>(props: TooltipPrimitive.Root.Props<Payload>) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

export function TooltipTrigger<Payload>(
	props: TooltipPrimitive.Trigger.Props<Payload>,
) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

/** One tooltip shared by many triggers: pass it as `handle` to the `Tooltip` and to each trigger. */
export function createTooltipHandle<Payload>() {
	return TooltipPrimitive.createHandle<Payload>()
}

type TooltipContentProps = TooltipPrimitive.Popup.Props &
	Pick<
		TooltipPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset"
	>

/** Base UI tooltips are visual only: `role="tooltip"` lets a trigger point at it with `aria-describedby`. */
export function TooltipContent({
	className,
	side = "top",
	sideOffset = 6,
	align = "center",
	alignOffset = 0,
	...props
}: TooltipContentProps) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				collisionPadding={8}
				className="isolate z-50 data-anchor-hidden:invisible"
			>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					role="tooltip"
					className={cn(
						"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 z-50 w-fit max-w-[min(var(--container-xs),var(--available-width))] origin-(--transform-origin) rounded-md border border-border bg-popover px-2.5 py-2 text-popover-foreground text-xs leading-snug shadow-black/50 shadow-lg data-closed:animate-out data-open:animate-in motion-reduce:animate-none",
						className,
					)}
					{...props}
				/>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	)
}
