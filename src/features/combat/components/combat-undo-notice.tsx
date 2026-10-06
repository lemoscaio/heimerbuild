import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type CombatUndoNoticeProps = {
	message: string
	onUndo: () => void
} & React.ComponentProps<"div">

/** What a marker edit did, with "Undo"; it stays until the combo changes again. */
export function CombatUndoNotice({
	message,
	onUndo,
	className,
	...props
}: CombatUndoNoticeProps) {
	return (
		<div
			role="status"
			className={cn(
				"flex items-center gap-3 rounded-lg border border-outcome-line bg-outcome-fill px-3 py-2 text-outcome-ink text-xs",
				className,
			)}
			{...props}
		>
			<p className="min-w-0 flex-1">{message}</p>
			<Button
				variant="outline"
				size="sm"
				onClick={onUndo}
				className="max-lg:h-11"
			>
				Undo
			</Button>
		</div>
	)
}
