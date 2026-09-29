import { useId } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { MAX_ITEMS } from "../lib/build-items"

type AddToBuildButtonProps = {
	itemId: string
	/** Disables the button and says why. */
	isBuildFull: boolean
	onAdd: (itemId: string) => void
	className?: string
}

export function AddToBuildButton({
	itemId,
	isBuildFull,
	onAdd,
	className,
}: AddToBuildButtonProps) {
	const reasonId = useId()

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Button
				type="button"
				size="lg"
				className="w-full bg-lilac text-primary-4 hover:bg-lilac/85"
				disabled={isBuildFull}
				aria-describedby={isBuildFull ? reasonId : undefined}
				onClick={() => onAdd(itemId)}
			>
				Add to build
			</Button>
			{isBuildFull && (
				<p id={reasonId} className="text-center text-lilac text-xs">
					All {MAX_ITEMS} item slots are full. Remove an item first.
				</p>
			)}
		</div>
	)
}
