import type {
	ChampionAbilities,
	ChampionSpell,
	DamageType,
} from "@schemas/champion"
import { cva } from "class-variance-authority"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import { type AbilityDamageBuild, abilityDamageAt } from "../lib/ability-damage"
import { formatAbilityValue, rankTableLines } from "../lib/ability-values"
import { UnavailableReason } from "./unavailable-reason"

type AbilityDetailsProps = {
	abilities: ChampionAbilities
	/** The ranks at the current level, highlighted in each table. */
	ranks: AbilityRanks | undefined
	/** The build each ability's damage is read at; none while it loads. */
	damage?: AbilityDamageBuild
}

/** The passive and each ability: description, its damage at the build, then cooldown, cost and every value per rank. */
export function AbilityDetails({
	abilities,
	ranks,
	damage,
}: AbilityDetailsProps) {
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
					unavailableReason={spell.unavailable?.reason}
				>
					{damage && (
						<SpellDamage
							spell={spell}
							rank={ranks?.[spell.slot] ?? 0}
							build={damage}
						/>
					)}
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
	/** Why the selected form can't cast it, when it can't. */
	unavailableReason?: string
	children?: React.ReactNode
}

function AbilityCard({
	icon,
	name,
	tag,
	description,
	unavailableReason,
	children,
}: AbilityCardProps) {
	const titleId = useId()
	const reasonId = useId()

	return (
		<article
			aria-labelledby={titleId}
			aria-describedby={unavailableReason ? reasonId : undefined}
			className="flex flex-col gap-2 rounded-xl bg-surface-sunken p-3"
		>
			<div className="flex items-center gap-3">
				<GameIcon
					src={icon}
					name={name}
					className={cn("size-10 rounded-lg", {
						grayscale: !!unavailableReason,
					})}
				/>
				<div className="flex flex-col">
					<h3 id={titleId} className="font-bold font-display text-sm">
						{name}
					</h3>
					<span className="text-subtle text-xs">{tag}</span>
				</div>
			</div>
			{unavailableReason && (
				<UnavailableReason id={reasonId} className="text-xs">
					{unavailableReason}
				</UnavailableReason>
			)}
			{description && (
				<p className="whitespace-pre-line text-prose text-xs leading-relaxed">
					{description}
				</p>
			)}
			{children}
		</article>
	)
}

const damageValue = cva("font-bold tabular-nums", {
	variants: {
		type: {
			physical: "text-physical",
			magic: "text-magic",
			true: "text-true-damage",
		},
	},
})

// cva types a "true" key as a boolean variant.
function damageVariant(type: DamageType) {
	return type === "true" || type
}

type SpellDamageProps = {
	spell: ChampionSpell
	rank: number
	build: AbilityDamageBuild
}

/** The tooltip's first damage at the build's stats and rank, before the target's resistances. */
function SpellDamage({ spell, rank, build }: SpellDamageProps) {
	const damage = abilityDamageAt(spell, rank, build)
	if (!damage) return null

	return (
		<p className="text-xs">
			<span className="text-subtle">Damage with this build: </span>
			<span className={damageValue({ type: damageVariant(damage.type) })}>
				{Math.round(damage.value)} {damage.type}
			</span>
			<span className="text-subtle"> before resistances</span>
		</p>
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
