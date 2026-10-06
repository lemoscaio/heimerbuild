import { Hourglass } from "lucide-react"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"

type CombatActionIconProps = {
	/** An ability's or summoner spell's icon; absent for an attack or a wait. */
	icon?: { src: string; name: string }
	kind: "attack" | "ability" | "summoner" | "wait"
	className?: string
}

/** The tile of an action: its game icon, "AA" for an attack, an hourglass for a wait. Decorative. */
export function CombatActionIcon({
	icon,
	kind,
	className,
}: CombatActionIconProps) {
	const tile = cn("size-8 shrink-0 rounded-md", className)
	if (icon) return <GameIcon name={icon.name} src={icon.src} className={tile} />
	return (
		<span
			aria-hidden="true"
			className={cn(
				tile,
				"flex items-center justify-center border border-line-strong font-bold font-display text-white text-xs",
				{ "border-dashed bg-surface-sunken text-subtle": kind === "wait" },
				{ "bg-surface-raised": kind !== "wait" },
			)}
		>
			{kind === "wait" ? <Hourglass className="size-4" /> : "AA"}
		</span>
	)
}
