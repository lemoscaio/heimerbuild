import { cva } from "class-variance-authority"
import { GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { MarkerView } from "../lib/combat-view"

const markerLine = cva(
	"flex items-center gap-2 rounded-md px-1 py-0.5 text-[0.6875rem] data-dragging:bg-surface-raised",
	{
		variants: {
			tone: {
				applied: "text-lilac",
				forced: "text-forced",
				"no-effect": "text-subtle opacity-70",
			},
			emphasis: {
				new: "outline-1 outline-gold",
				none: "",
			},
		},
	},
)

const rule = cva("h-0 min-w-4 flex-1 border-t-2", {
	variants: {
		tone: {
			applied: "border-lilac",
			forced: "border-forced",
			"no-effect": "border-line-strong border-dashed",
		},
	},
})

type CombatMarkerLineProps = {
	view: MarkerView
	/** Just added: pointed out until the combo changes again. */
	isNew: boolean
	/** The reorder handle's events (`useStepReorder`). */
	handleProps: React.ComponentProps<"button">
	onRemove: () => void
} & React.ComponentProps<"li">

/** A situation marker in the combo: a thin line with its label and what it did, moved by its handle, removed with ×. */
export function CombatMarkerLine({
	view,
	isNew,
	handleProps,
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
			<button
				type="button"
				aria-label={`Move marker ${label}`}
				aria-description="Drag, or press the up and down arrow keys"
				className="flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-subtle hover:text-white focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing max-lg:h-11"
				{...handleProps}
			>
				<GripVertical aria-hidden="true" className="size-4" />
			</button>
			<span aria-hidden="true" className={rule({ tone })} />
			<span className="font-semibold">{label}</span>
			<span className="min-w-0">
				{detail}
				{isNew && " · new"}
			</span>
			<span aria-hidden="true" className={rule({ tone })} />
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove marker ${label}`}
				onClick={onRemove}
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}
