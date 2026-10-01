import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/cn"

export function Popover<Payload>(props: PopoverPrimitive.Root.Props<Payload>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

export function PopoverTrigger<Payload>(
	props: PopoverPrimitive.Trigger.Props<Payload>,
) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

type PopoverContentProps = PopoverPrimitive.Popup.Props &
	Pick<
		PopoverPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset"
	>

export function PopoverContent({
	className,
	side = "bottom",
	sideOffset = 6,
	align = "center",
	alignOffset = 0,
	...props
}: PopoverContentProps) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				collisionPadding={8}
				className="isolate z-50"
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 z-50 flex w-72 max-w-(--available-width) origin-(--transform-origin) flex-col gap-1 rounded-md border border-border bg-popover px-2.5 py-2 text-popover-foreground text-xs leading-snug shadow-black/50 shadow-lg outline-hidden data-closed:animate-out data-open:animate-in motion-reduce:animate-none",
						className,
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	)
}

export function PopoverTitle({
	className,
	...props
}: PopoverPrimitive.Title.Props) {
	return (
		<PopoverPrimitive.Title
			data-slot="popover-title"
			className={cn("font-semibold text-sm", className)}
			{...props}
		/>
	)
}

export function PopoverDescription({
	className,
	...props
}: PopoverPrimitive.Description.Props) {
	return (
		<PopoverPrimitive.Description
			data-slot="popover-description"
			className={cn("text-prose", className)}
			{...props}
		/>
	)
}
