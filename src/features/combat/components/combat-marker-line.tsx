import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { MarkerView } from "../lib/combat-view"

const markerLine = cva(
	"flex items-center gap-2 rounded-md px-1 py-0.5 text-[0.6875rem]",
	{
		variants: {
			tone: {
				applied: "text-lilac",
				forced: "text-forced",
				ignored: "text-subtle",
				"no-effect": "text-subtle",
			},
			emphasis: {
				new: "outline-1 outline-gold",
				none: "",
			},
		},
	},
)

/** The line's two halves; on phones the text takes the row and a left accent marks it instead. */
const rule = cva("h-0 min-w-4 flex-1 border-t-2 max-sm:hidden", {
	variants: {
		tone: {
			applied: "border-lilac",
			forced: "border-forced",
			ignored: "border-line-strong border-dashed",
			"no-effect": "border-line-strong border-dashed",
		},
	},
})

type CombatMarkerLineProps = {
	view: MarkerView
	/** Just added: pointed out until the combo changes again. */
	isNew: boolean
	/** Its "Move up" and "Move down" buttons (`CombatMoveButtons`), side by side. */
	moves: React.ReactNode
	onRemove: () => void
} & React.ComponentProps<"li">

/** A situation marker in the combo: a thin line with its label and what it did, moved up or down, removed with ×. */
export function CombatMarkerLine({
	view,
	isNew,
	moves,
	onRemove,
	className,
	...props
}: CombatMarkerLineProps) {
	const { label, detail, tone } = view
	return (
		<li
			aria-label={`Marker: ${label}, ${detail}`}
			className={cn(
				markerLine({ tone, emphasis: isNew ? "new" : "none" }),
				className,
			)}
			{...props}
		>
			{moves}
			<span aria-hidden="true" className={rule({ tone })} />
			<span className="min-w-0 border-current max-sm:flex-1 max-sm:border-l-2 max-sm:pl-2">
				<span className="font-semibold">{label}</span>{" "}
				<span>
					{detail}
					{isNew && " · new"}
				</span>
			</span>
			<span aria-hidden="true" className={rule({ tone })} />
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove marker ${label}`}
				onClick={onRemove}
				className="max-lg:size-11"
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}
