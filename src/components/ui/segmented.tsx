import { cva, type VariantProps } from "class-variance-authority"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"

/** Segmented choices on a track, one pressed at a time ("List | Timeline"). */
export function Segmented<Value extends string>({
	className,
	...props
}: React.ComponentProps<typeof ToggleGroup<Value>>) {
	return (
		<ToggleGroup
			className={cn(
				"gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.5",
				className,
			)}
			{...props}
		/>
	)
}

const segmentedItemVariants = cva(
	"rounded-md px-3 text-xs data-pressed:inset-ring-0 data-pressed:bg-lilac data-pressed:font-semibold data-pressed:text-surface-sunken",
	{
		variants: {
			height: {
				compact: "h-6",
				touch: "h-6 max-lg:h-11",
			},
		},
		defaultVariants: { height: "compact" },
	},
)

type SegmentedItemProps<Value extends string> = Omit<
	React.ComponentProps<typeof ToggleGroupItem<Value>>,
	"size"
> &
	VariantProps<typeof segmentedItemVariants>

/** One segment; `touch` grows it to 44 px on phones, where it is tapped. */
export function SegmentedItem<Value extends string>({
	height,
	className,
	...props
}: SegmentedItemProps<Value>) {
	return (
		<ToggleGroupItem
			className={cn(segmentedItemVariants({ height }), className)}
			{...props}
		/>
	)
}
