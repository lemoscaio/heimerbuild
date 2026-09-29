import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

type ResetBuildButtonProps = {
	onReset: () => void
}

export function ResetBuildButton({ onReset }: ResetBuildButtonProps) {
	return (
		<Button
			type="button"
			variant="secondary"
			className="size-11 shrink-0"
			aria-label="Reset build"
			onClick={onReset}
		>
			<RotateCcw />
		</Button>
	)
}
