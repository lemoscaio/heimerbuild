import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "@/lib/cn"

/** A bottom sheet (shadcn/ui drawer on Base UI, bottom only): swipe down or Esc closes it. */
export function Drawer<Payload>(props: DrawerPrimitive.Root.Props<Payload>) {
	return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

export function DrawerTrigger<Payload>(
	props: DrawerPrimitive.Trigger.Props<Payload>,
) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

export function DrawerContent({
	className,
	children,
	...props
}: DrawerPrimitive.Popup.Props) {
	return (
		<DrawerPrimitive.Portal>
			<DrawerPrimitive.Backdrop
				data-slot="drawer-overlay"
				className="fixed inset-0 z-50 min-h-dvh bg-black/55 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none"
			/>
			<DrawerPrimitive.Viewport
				data-slot="drawer-viewport"
				className="fixed inset-0 z-50 flex items-end justify-center"
			>
				<DrawerPrimitive.Popup
					data-slot="drawer-popup"
					className={cn(
						"max-h-[calc(100dvh-4rem)] w-full translate-y-(--drawer-swipe-movement-y) overflow-y-auto overscroll-contain rounded-t-2xl border-lilac border-t bg-surface px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] text-prose shadow-black/50 shadow-lg outline-none transition-transform duration-300 ease-out data-ending-style:translate-y-full data-starting-style:translate-y-full data-swiping:duration-0 motion-reduce:transition-none",
						className,
					)}
					{...props}
				>
					<div
						aria-hidden="true"
						className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong"
					/>
					<DrawerPrimitive.Content data-slot="drawer-content">
						{children}
					</DrawerPrimitive.Content>
				</DrawerPrimitive.Popup>
			</DrawerPrimitive.Viewport>
		</DrawerPrimitive.Portal>
	)
}

export function DrawerTitle({
	className,
	...props
}: DrawerPrimitive.Title.Props) {
	return (
		<DrawerPrimitive.Title
			data-slot="drawer-title"
			className={cn("font-bold font-display text-sm text-white", className)}
			{...props}
		/>
	)
}

export function DrawerClose(props: DrawerPrimitive.Close.Props) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}
