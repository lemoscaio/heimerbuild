import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type CombatFreeBannerProps = {
	/** How many outcomes differ from the computed ones. */
	changes: number
	onRestore: () => void
} & React.ComponentProps<"section">

/** Free mode's notice: what it changes, how many outcomes were set, and "Restore computed". */
export function CombatFreeBanner({
	changes,
	onRestore,
	className,
	...props
}: CombatFreeBannerProps) {
	return (
		<section
			aria-label="Free mode"
			className={cn(
				"flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-lilac px-3 py-2 text-prose text-xs",
				className,
			)}
			{...props}
		>
			<p className="min-w-0 flex-1">
				Free mode: markers only apply their situation, and cooldowns and time
				don't block. Each outcome starts from the computed one.
			</p>
			<p className="font-semibold text-gold" aria-live="polite">
				{changes === 1 ? "1 change" : `${changes} changes`}
			</p>
			<Button
				variant="secondary"
				size="sm"
				disabled={!changes}
				onClick={onRestore}
				className="max-lg:h-11"
			>
				Restore computed
			</Button>
		</section>
	)
}
