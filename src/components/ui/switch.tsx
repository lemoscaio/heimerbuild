import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/cn"

/** An on/off switch; its touch area reaches 44 px around the 32 × 18 px track. */
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"group/switch relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors after:absolute after:-inset-x-1.5 after:-inset-y-3.25 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 data-disabled:cursor-not-allowed data-checked:bg-lilac data-unchecked:bg-line-strong data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block size-3.5 rounded-full bg-white shadow-black/50 shadow-sm transition-transform data-checked:translate-x-3.5"
			/>
		</SwitchPrimitive.Root>
	)
}
