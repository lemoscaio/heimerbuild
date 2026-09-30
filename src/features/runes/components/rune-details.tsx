import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { PerkDetail } from "../lib/perk-detail"
import { RuneDescription } from "./rune-description"

type RuneDetailsProps = {
	detail: PerkDetail | undefined
} & Omit<React.ComponentProps<"section">, "children">

/** What the hovered or focused tree, rune or shard does, with its numbers. */
export function RuneDetails({ detail, className, ...props }: RuneDetailsProps) {
	return (
		<section
			aria-label="Rune details"
			className={cn(
				"flex min-h-20 items-start gap-3.5 rounded-xl bg-primary-0 px-4 py-3.5",
				detail?.accentClass,
				className,
			)}
			{...props}
		>
			{detail ? (
				<>
					<GameIcon
						src={detail.icon}
						name={detail.name}
						className="size-11 rounded-full border-(--tree) border-2 bg-primary-4"
					/>
					<div className="flex min-w-0 flex-col gap-1.5">
						<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
							<h3 className="font-bold font-display text-base text-white">
								{detail.name}
							</h3>
							<span className="text-subtle text-xs">{detail.origin}</span>
							{detail.isConditional && (
								<span className="rounded-full bg-lilac/20 px-2 py-0.5 text-[11px] text-prose">
									Conditional: not added to your stats
								</span>
							)}
						</div>
						<RuneDescription text={detail.text} />
					</div>
				</>
			) : (
				<p className="self-center text-subtle text-xs">
					Hover, focus or tap a rune to read what it does.
				</p>
			)}
		</section>
	)
}
