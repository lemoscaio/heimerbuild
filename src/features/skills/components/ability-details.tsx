import type { ChampionAbilities, ChampionSpell } from "@schemas/champion"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import { formatAbilityValue, rankTableLines } from "../lib/ability-values"

type AbilityDetailsProps = {
	abilities: ChampionAbilities
	/** The ranks at the current level, highlighted in each table. */
	ranks: AbilityRanks | undefined
}

/** The passive and each ability: description, then cooldown, cost and every value per rank. */
export function AbilityDetails({ abilities, ranks }: AbilityDetailsProps) {
	const { passive } = abilities

	return (
		<div className="flex flex-col gap-3">
			<AbilityCard
				icon={passive.icon}
				name={passive.name}
				tag="Passive"
				description={passive.description}
			/>
			{abilities.spells.map((spell) => (
				<AbilityCard
					key={spell.slot}
					icon={spell.icon}
					name={spell.name}
					tag={`${spell.slot} · Rank ${ranks?.[spell.slot] ?? 0}/${spell.maxRank}`}
					description={spell.description}
				>
					<RankTable spell={spell} rank={ranks?.[spell.slot] ?? 0} />
				</AbilityCard>
			))}
		</div>
	)
}

type AbilityCardProps = {
	icon: string
	name: string
	tag: string
	description: string
	children?: React.ReactNode
}

function AbilityCard({
	icon,
	name,
	tag,
	description,
	children,
}: AbilityCardProps) {
	const titleId = useId()

	return (
		<article
			aria-labelledby={titleId}
			className="flex flex-col gap-2 rounded-xl bg-surface-sunken p-3"
		>
			<div className="flex items-center gap-3">
				<GameIcon src={icon} name={name} className="size-10 rounded-lg" />
				<div className="flex flex-col">
					<h3 id={titleId} className="font-bold font-display text-sm">
						{name}
					</h3>
					<span className="text-subtle text-xs">{tag}</span>
				</div>
			</div>
			{description && (
				<p className="whitespace-pre-line text-prose text-xs leading-relaxed">
					{description}
				</p>
			)}
			{children}
		</article>
	)
}

function RankTable({ spell, rank }: { spell: ChampionSpell; rank: number }) {
	const ranks = Array.from({ length: spell.maxRank }, (_, index) => index + 1)
	const hasCooldown = spell.cooldown.some((seconds) => seconds > 0)
	const cost = spell.cost

	return (
		<div className="scrollbar-purple overflow-x-auto">
			<table className="w-full border-collapse text-xs tabular-nums">
				<caption className="sr-only">{spell.name} per rank</caption>
				<thead>
					<tr className="text-subtle">
						<th scope="col" className="py-1 pr-3 text-left font-normal">
							Rank
						</th>
						{ranks.map((column) => (
							<RankHeader key={column} column={column} rank={rank} />
						))}
					</tr>
				</thead>
				<tbody>
					{hasCooldown && (
						<RankRow
							label="Cooldown"
							values={spell.cooldown.map(
								(seconds) => `${formatAbilityValue(seconds)}s`,
							)}
							rank={rank}
						/>
					)}
					{cost &&
						("values" in cost ? (
							<RankRow
								label={`Cost${cost.unit ? ` (${cost.unit})` : ""}`}
								values={cost.values.map((value) => formatAbilityValue(value))}
								rank={rank}
							/>
						) : (
							<tr className="border-line border-t">
								<th
									scope="row"
									className="py-1 pr-3 text-left font-normal text-prose"
								>
									Cost
								</th>
								<td colSpan={ranks.length} className="py-1 text-center">
									{cost.text}
								</td>
							</tr>
						))}
					{rankTableLines(spell).map(({ label, unit, values }) => (
						<RankRow
							key={label}
							label={label}
							values={values.map((value) => formatAbilityValue(value, unit))}
							rank={rank}
						/>
					))}
				</tbody>
			</table>
		</div>
	)
}

function RankHeader({ column, rank }: { column: number; rank: number }) {
	return (
		<th
			scope="col"
			aria-current={column === rank ? "true" : undefined}
			className={cn("px-1.5 py-1 text-center font-normal", {
				"font-bold text-gold": column === rank,
			})}
		>
			{column}
		</th>
	)
}

function RankRow({
	label,
	values,
	rank,
}: {
	label: string
	values: readonly string[]
	rank: number
}) {
	return (
		<tr className="border-line border-t">
			<th scope="row" className="py-1 pr-3 text-left font-normal text-prose">
				{label}
			</th>
			{values.map((value, index) => (
				<td
					// biome-ignore lint/suspicious/noArrayIndexKey: one cell per rank, never reordered
					key={index}
					className={cn("px-1.5 py-1 text-center", {
						"rounded-sm bg-gold/15 font-bold text-gold": index + 1 === rank,
					})}
				>
					{value}
				</td>
			))}
		</tr>
	)
}
