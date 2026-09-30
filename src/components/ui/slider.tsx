import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/cn"

/** `aria-label` names each thumb: the thumb's hidden range input is the element with the slider role. */
export function Slider<Value extends number | readonly number[]>({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	"aria-label": ariaLabel,
	...props
}: SliderPrimitive.Root.Props<Value>) {
	const values = Array.isArray(value)
		? value
		: Array.isArray(defaultValue)
			? defaultValue
			: [value ?? defaultValue ?? min]

	return (
		<SliderPrimitive.Root
			className={cn("data-vertical:h-full data-horizontal:w-full", className)}
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			{...props}
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none select-none items-center py-2 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50 max-lg:py-4.5">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative grow select-none overflow-hidden rounded-full bg-primary-1 data-horizontal:h-2 data-vertical:h-full data-horizontal:w-full data-vertical:w-2"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="select-none bg-lilac data-horizontal:h-full data-vertical:w-full"
					/>
				</SliderPrimitive.Track>
				{values.map((_, index) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						// biome-ignore lint/suspicious/noArrayIndexKey: thumbs have no identity beyond their position
						key={index}
						aria-label={ariaLabel}
						// The focused range input is visually hidden: its thumb shows the focus outline.
						className="relative block size-4 shrink-0 select-none rounded-full bg-white shadow-black/50 shadow-sm transition-transform after:absolute after:-inset-2 hover:scale-110 has-disabled:pointer-events-none has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-offset-2 max-lg:after:-inset-3.5"
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	)
}
