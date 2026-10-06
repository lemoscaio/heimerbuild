import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { AbilityVariant } from "@/lib/combat/registries/ability-hits"

type CombatVariantInputProps = {
	variants: readonly AbilityVariant[]
	/** The variant picked; the first when none is. */
	value: string | undefined
	onValueChange: (variant: string) => void
} & Omit<React.ComponentProps<"div">, "defaultValue">

/** Blue: an input the simulator can't know, picked per step in both modes (Decimate's outer blade or inner handle). */
export function CombatVariantInput({
	variants,
	value,
	onValueChange,
	className,
	...props
}: CombatVariantInputProps) {
	const current = value ?? variants[0]?.id
	if (!variants.length || !current) return null
	return (
		<div
			className={cn(
				"flex w-fit items-center gap-1.5 rounded-full border border-input-line bg-input-fill py-0.5 pr-0.5 pl-2 text-[0.625rem] text-input-ink",
				className,
			)}
			{...props}
		>
			<span>Lands</span>
			<ToggleGroup
				aria-label="How it lands"
				value={[current]}
				onValueChange={([variant]) => {
					if (variant) onValueChange(variant)
				}}
				className="gap-0.5"
			>
				{variants.map((variant) => (
					<ToggleGroupItem
						key={variant.id}
						value={variant.id}
						className="h-5 min-w-0 rounded-full px-1.5 text-[0.625rem] data-pressed:bg-input-line data-pressed:text-white max-lg:h-8"
					>
						{variant.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	)
}
