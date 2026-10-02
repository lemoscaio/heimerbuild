import type { SummonerSpell } from "@schemas/summoner-spell"
import { GameIcon } from "@/components/common/game-icon"

type SummonerEffectsNoteProps = {
	/** The two slots' spells; nothing shows while both are empty. */
	spells: readonly (SummonerSpell | undefined)[]
}

/** Under the stats: the chosen summoner spells, whose effects are not in the stats yet. */
export function SummonerEffectsNote({ spells }: SummonerEffectsNoteProps) {
	const chosen = spells.filter((spell) => spell !== undefined)
	if (!chosen.length) return null

	return (
		<section
			aria-label="Additional effects"
			className="flex flex-col gap-2 rounded-lg border border-line border-dashed p-2.5 text-xs"
		>
			<ul className="flex flex-col gap-1.5">
				{chosen.map((spell) => (
					<li key={spell.id} className="flex items-center gap-2">
						<GameIcon
							src={spell.icon}
							name={spell.name}
							className="size-4.5 rounded"
						/>
						<span className="font-semibold text-white">{spell.name}</span>
						<span className="rounded-full bg-lilac/20 px-1.5 py-px text-[10px] text-lilac">
							Effect later
						</span>
					</li>
				))}
			</ul>
			<p className="text-subtle leading-5">
				Summoner spells don't change these stats yet. Their effects (damage,
				shields, speed) and the runes that react to them come later.
			</p>
		</section>
	)
}
