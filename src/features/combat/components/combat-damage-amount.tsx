import { cva } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { DAMAGE_TYPE_NAMES, formatDamage } from "../lib/combat-format"
import type { DamageTypeShare } from "../lib/combat-view"
import { damageTypeFill, damageTypeText } from "./damage-type-styles"

const amount = cva("font-bold font-display tabular-nums", {
	variants: {
		size: {
			/** A step's or a group's total. */
			md: "text-base",
			/** A proc's, a row's. */
			sm: "text-sm",
		},
	},
})

const SHORT_NAMES = {
	physical: "phys",
	magic: "mag",
	true: "true",
} as const satisfies Record<DamageTypeShare["type"], string>

/** "42 physical · 19 magic" ("phys", "mag" on phones) over a thin bar in the types' colors. */
function TypeSplit({ parts }: { parts: readonly DamageTypeShare[] }) {
	return (
		<span className="flex w-full flex-col items-end gap-0.5 max-sm:max-w-16">
			<ul
				aria-label="Split by type"
				className="flex flex-wrap justify-end gap-x-1 text-[0.625rem] tabular-nums leading-tight"
			>
				{parts.map(({ type, final }) => (
					<li
						key={type}
						className={cn(
							"whitespace-nowrap not-last:after:text-subtle not-last:after:content-['_·']",
							damageTypeText(type),
						)}
					>
						{formatDamage(final)}{" "}
						<span aria-hidden="true" className="sm:hidden">
							{SHORT_NAMES[type]}
						</span>
						<span className="max-sm:sr-only">{DAMAGE_TYPE_NAMES[type]}</span>
					</li>
				))}
			</ul>
			<span
				aria-hidden="true"
				className="flex h-0.5 w-full min-w-8 gap-px overflow-hidden rounded-full"
			>
				{parts.map(({ type, final }) => (
					<span
						key={type}
						className={cn("basis-0", damageTypeFill(type))}
						style={{ flexGrow: final }}
					/>
				))}
			</span>
		</span>
	)
}

type CombatDamageAmountProps = {
	final: number
	/** The types that dealt it (`typeShares`). */
	parts: readonly DamageTypeShare[]
	size?: "md" | "sm"
	/** More under the number: its raw damage. */
	children?: React.ReactNode
} & React.ComponentProps<"span">

/**
 * A damage number in its type's color when one type dealt it; neutral, with its split by type
 * under it, when several did (true damage is a type of its own).
 */
export function CombatDamageAmount({
	final,
	parts,
	size = "md",
	children,
	className,
	...props
}: CombatDamageAmountProps) {
	const [only] = parts
	const single = parts.length === 1 ? only : undefined
	return (
		<span
			className={cn("flex flex-col items-end text-right", className)}
			{...props}
		>
			<span
				className={cn(
					amount({ size }),
					single ? damageTypeText(single.type) : "text-white",
				)}
			>
				{formatDamage(final)}
			</span>
			{children}
			{parts.length > 1 && <TypeSplit parts={parts} />}
		</span>
	)
}
