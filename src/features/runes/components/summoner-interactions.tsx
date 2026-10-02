import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { RuneSummonerHint } from "@/lib/summoner-rune-interactions"

type SummonerInteractionsProps = {
	hints: readonly RuneSummonerHint[]
	className?: string
}

/** The end of the rune page: each rune that reacts to the chosen summoner spells, and how. */
export function SummonerInteractions({
	hints,
	className,
}: SummonerInteractionsProps) {
	return (
		<section
			aria-label="Summoner spell interactions"
			className={cn(
				"flex flex-col gap-2.5 rounded-xl border border-gold/30 bg-surface-raised px-4 py-3",
				className,
			)}
		>
			<h3 className="font-semibold text-[10px] text-gold uppercase tracking-[0.14em]">
				Summoner spell interactions
			</h3>
			<ul className="flex flex-col gap-2.5">
				{hints.map(({ rune, spells, text }) => (
					<li key={rune.id} className="flex items-start gap-3">
						<GameIcon
							src={rune.icon}
							name={rune.name}
							className="size-8 rounded-full bg-surface-sunken"
						/>
						<div className="flex min-w-0 flex-col gap-0.5">
							<div className="flex items-center gap-2">
								<span className="font-semibold text-sm text-white">
									{rune.name}
								</span>
								<span className="sr-only">
									({spells.map((spell) => spell.name).join(", ")})
								</span>
								<span aria-hidden="true" className="flex gap-0.5">
									{spells.map((spell) => (
										<GameIcon
											key={spell.id}
											src={spell.icon}
											name={spell.name}
											className="size-4 rounded-sm"
										/>
									))}
								</span>
							</div>
							<p className="text-prose text-xs leading-snug">{text}</p>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}
