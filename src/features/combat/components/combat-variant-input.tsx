import { cva } from "class-variance-authority"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { AreaVariant } from "@/lib/combat/area-ticks"
import type { VariantsLabel } from "@/lib/combat/registries/ability-hits"

/** With its ticks, a variant reads "1 s · 3 ticks" on one line, stacked on phones in the same 32 px. */
const variantItem = cva(
	"h-5 min-w-0 rounded-full px-1.5 text-[0.625rem] data-pressed:bg-input-ink data-pressed:font-semibold data-pressed:text-input-fill max-lg:h-8",
	{
		variants: {
			ticks: {
				shown: "max-lg:flex-col max-lg:gap-0 max-lg:leading-none",
				none: "",
			},
		},
	},
)

/** "· 3 ticks" beside the time, "3 ticks" under it on phones; read as "1 s, 3 ticks". */
function VariantTicks({ ticks }: { ticks: number }) {
	return (
		<span className="font-normal">
			<span className="sr-only">, </span>
			<span aria-hidden="true" className="max-lg:hidden">
				·{" "}
			</span>
			{ticks === 1 ? "1 tick" : `${ticks} ticks`}
		</span>
	)
}

type CombatVariantInputProps = {
	variants: readonly AreaVariant[]
	/** What they pick: "Lands" (Decimate), "In trail" (Poison Trail). */
	label: VariantsLabel
	/** The variant picked; the first when none is. */
	value: string | undefined
	onValueChange: (variant: string) => void
} & Omit<React.ComponentProps<"div">, "defaultValue">

/** Blue: an input the simulator can't know, picked per step in both modes (Decimate's outer blade or inner handle). */
export function CombatVariantInput({
	variants,
	label,
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
			<span>{label.text}</span>
			<ToggleGroup
				aria-label={label.name}
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
						className={variantItem({
							ticks: variant.ticks === undefined ? "none" : "shown",
						})}
					>
						{variant.label}
						{variant.ticks !== undefined && (
							<VariantTicks ticks={variant.ticks} />
						)}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	)
}
