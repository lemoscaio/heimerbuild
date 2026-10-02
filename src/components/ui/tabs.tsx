import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/cn"

/** Horizontal tabs: the list above the panels. */
export function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-3", className)}
			{...props}
		/>
	)
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"inline-flex w-fit items-center justify-center gap-1 rounded-lg bg-surface-sunken p-1 text-subtle",
				className,
			)}
			{...props}
		/>
	)
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 font-semibold text-sm transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-50 data-active:bg-lilac data-active:text-surface-sunken [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	)
}

export function TabsContent({
	className,
	...props
}: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	)
}
