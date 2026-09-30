import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/cn"

export const Combobox = ComboboxPrimitive.Root

export function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

/** The input box that holds the chips (selected values) and the text input. */
export function ComboboxChips({
	className,
	...props
}: ComboboxPrimitive.Chips.Props) {
	return (
		<ComboboxPrimitive.Chips
			data-slot="combobox-chips"
			className={cn(
				"flex min-h-8 cursor-text flex-wrap items-center gap-1 rounded-md border border-primary-1 bg-primary-3 px-2 py-1 text-sm transition-colors focus-within:border-lilac",
				className,
			)}
			{...props}
		/>
	)
}

type ComboboxChipProps = {
	/** Accessible name of the remove button. */
	removeLabel: string
} & ComboboxPrimitive.Chip.Props

export function ComboboxChip({
	className,
	children,
	removeLabel,
	...props
}: ComboboxChipProps) {
	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			className={cn(
				"flex h-6 w-fit items-center gap-1 whitespace-nowrap rounded-sm border border-lilac bg-primary-2 pl-2 font-semibold text-white text-xs outline-none data-highlighted:bg-primary-1 max-lg:h-8",
				className,
			)}
			{...props}
		>
			{children}
			<ComboboxPrimitive.ChipRemove
				data-slot="combobox-chip-remove"
				aria-label={removeLabel}
				className="flex h-full items-center px-1 text-subtle hover:text-white max-lg:px-2"
			>
				<XIcon className="pointer-events-none size-3" />
			</ComboboxPrimitive.ChipRemove>
		</ComboboxPrimitive.Chip>
	)
}

export function ComboboxChipsInput({
	className,
	...props
}: ComboboxPrimitive.Input.Props) {
	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-chip-input"
			className={cn(
				"h-6 min-w-16 flex-1 bg-transparent text-white outline-none placeholder:text-subtle",
				className,
			)}
			{...props}
		/>
	)
}

export function ComboboxContent({
	className,
	side = "bottom",
	sideOffset = 6,
	align = "start",
	alignOffset = 0,
	anchor,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		"side" | "align" | "sideOffset" | "alignOffset" | "anchor"
	>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				collisionPadding={8}
				className="isolate z-50"
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					className={cn(
						"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-md border border-lilac bg-popover text-popover-foreground shadow-black/50 shadow-lg duration-100 data-closed:animate-out data-open:animate-in motion-reduce:animate-none",
						className,
					)}
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	)
}

export function ComboboxList({
	className,
	...props
}: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn(
				"max-h-[min(20rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
				className,
			)}
			{...props}
		/>
	)
}

export function ComboboxItem({
	className,
	...props
}: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50 max-lg:min-h-11",
				className,
			)}
			{...props}
		/>
	)
}

/** Shown in the popup when the list has no items. */
export function ComboboxEmpty({
	className,
	...props
}: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn(
				"hidden w-full px-3 py-2 text-subtle text-xs group-data-empty/combobox-content:flex",
				className,
			)}
			{...props}
		/>
	)
}
