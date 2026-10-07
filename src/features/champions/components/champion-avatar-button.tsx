import type { Champion } from "@schemas/champion"
import { GameIcon } from "@/components/common/game-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"

const LABEL = "Switch champion"

type ChampionAvatarButtonProps = {
	champion: Pick<Champion, "name" | "icon">
	/** The selected form's name, over the portrait. */
	caption?: string
} & React.ComponentProps<"button">

/**
 * The champion's portrait as the button that opens the champion picker (set its size and corners
 * with `className`). It can be a popup trigger: `<PopoverTrigger render={<ChampionAvatarButton />} />`.
 */
export function ChampionAvatarButton({
	champion,
	caption,
	className,
	...props
}: ChampionAvatarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={LABEL}
						className={cn(
							"group shrink-0 cursor-pointer outline-none transition focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface aria-expanded:ring-3 aria-expanded:ring-lilac aria-expanded:ring-offset-2 aria-expanded:ring-offset-surface",
							className,
						)}
						{...props}
					/>
				}
			>
				<GameIcon
					src={champion.icon}
					name={champion.name}
					caption={caption}
					className="size-full rounded-[inherit] border-2 border-gold/70 group-hover:border-gold"
				/>
			</TooltipTrigger>
			<TooltipContent>{LABEL}</TooltipContent>
		</Tooltip>
	)
}
