import type { AbilitySlot, ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { CombatAction } from "@/lib/combat/combat"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type { SummonerSlot } from "@/lib/summoner-slots"
import { type DamageStatus, damageStatus } from "./ability-damage-status"
import { WAIT_SECONDS } from "./combat-sequence"

/** A key that adds an action to the combo, with what the combo knows about it. */
export type CombatKey =
	| { kind: "attack"; action: CombatAction }
	| {
			kind: "ability"
			action: CombatAction
			slot: AbilitySlot
			name: string
			icon: string
			/** Why a cast would be refused whatever the order: no point yet, or the form can't cast it. */
			unusable?: string
			damage: DamageStatus
	  }
	| {
			kind: "summoner"
			action: CombatAction
			slot: SummonerSlot
			name: string
			icon: string
	  }
	| { kind: "wait"; action: CombatAction }

type CombatKeysInput = {
	/** The abilities as the selected form shows them. */
	spells: readonly ChampionSpell[]
	ranks: AbilityRanks | undefined
	summoners: readonly (SummonerSpell | undefined)[]
}

/** The keys of the combo: attack, Q W E R, the chosen summoner spells and wait, in that order. */
export function combatKeys({
	spells,
	ranks,
	summoners,
}: CombatKeysInput): CombatKey[] {
	const abilityKeys = spells.map((spell): CombatKey => {
		const unusable =
			(ranks?.[spell.slot] ?? 0) < 1
				? `${spell.name} has no point yet`
				: spell.unavailable?.reason
		return {
			kind: "ability",
			action: { kind: "ability", slot: spell.slot },
			slot: spell.slot,
			name: spell.name,
			icon: spell.icon,
			...(unusable && { unusable }),
			damage: damageStatus(spell.damage),
		}
	})
	const summonerKeys = summoners.flatMap((spell, index): CombatKey[] =>
		spell
			? [
					{
						kind: "summoner",
						action: { kind: "summoner", slot: index as SummonerSlot },
						slot: index as SummonerSlot,
						name: spell.name,
						icon: spell.icon,
					},
				]
			: [],
	)
	return [
		{ kind: "attack", action: { kind: "attack" } },
		...abilityKeys,
		...summonerKeys,
		{ kind: "wait", action: { kind: "wait", seconds: WAIT_SECONDS.initial } },
	]
}
