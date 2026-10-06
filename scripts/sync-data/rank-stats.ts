import { AMBESSA_ARMOR_PENETRATION_RANK_STAT } from "./champions/ambessa"
import { ANNIE_MAGIC_PENETRATION_RANK_STAT } from "./champions/annie"
import { DARIUS_ARMOR_PENETRATION_RANK_STAT } from "./champions/darius"
import { JANNA_MOVEMENT_SPEED_RANK_STAT } from "./champions/janna"
import { JARVAN_IV_ATTACK_SPEED_RANK_STAT } from "./champions/jarvan-iv"
import { KOG_MAW_ATTACK_SPEED_RANK_STAT } from "./champions/kog-maw"
import { MORDEKAISER_MAGIC_PENETRATION_RANK_STAT } from "./champions/mordekaiser"
import { NOCTURNE_ATTACK_SPEED_RANK_STAT } from "./champions/nocturne"
import {
	OLAF_ARMOR_RANK_STAT,
	OLAF_MAGIC_RESIST_RANK_STAT,
} from "./champions/olaf"
import { PANTHEON_ARMOR_PENETRATION_RANK_STAT } from "./champions/pantheon"
import { TEEMO_MOVEMENT_SPEED_RANK_STAT } from "./champions/teemo"
import { TWISTED_FATE_ATTACK_SPEED_RANK_STAT } from "./champions/twisted-fate"
import { ZAAHEN_ARMOR_PENETRATION_RANK_STAT } from "./champions/zaahen"
import type { AbilitySlot, RankStat } from "./schemas/champion"

export type RankStatRule = {
	/** Data Dragon string id ("TwistedFate"). */
	championKey: string
	slot: AbilitySlot
	stat: RankStat["stat"]
	/** The spell value in the CommunityDragon character bin, by its `DataValues` name. */
	dataValue: string
	/** Turns the game value into the stat's unit: 0.01 makes 15 (percent) the fraction 0.15. */
	scale?: number
	/** What the rank grants, and any condition the stats panel assumes. */
	reason: string
	source: string
}

/**
 * Stats an ability grants by its rank alone. The values come from the game files, so a patch
 * that changes a number updates the data; a renamed value fails the sync. One file per champion
 * in `champions/`.
 */
export const RANK_STAT_RULES: readonly RankStatRule[] = [
	AMBESSA_ARMOR_PENETRATION_RANK_STAT,
	ANNIE_MAGIC_PENETRATION_RANK_STAT,
	DARIUS_ARMOR_PENETRATION_RANK_STAT,
	JANNA_MOVEMENT_SPEED_RANK_STAT,
	JARVAN_IV_ATTACK_SPEED_RANK_STAT,
	KOG_MAW_ATTACK_SPEED_RANK_STAT,
	MORDEKAISER_MAGIC_PENETRATION_RANK_STAT,
	NOCTURNE_ATTACK_SPEED_RANK_STAT,
	OLAF_ARMOR_RANK_STAT,
	OLAF_MAGIC_RESIST_RANK_STAT,
	PANTHEON_ARMOR_PENETRATION_RANK_STAT,
	TEEMO_MOVEMENT_SPEED_RANK_STAT,
	TWISTED_FATE_ATTACK_SPEED_RANK_STAT,
	ZAAHEN_ARMOR_PENETRATION_RANK_STAT,
]

/** A rule's value per rank, from rank 1; fails when the game files lack it. */
export function rankStatValues(
	rule: RankStatRule,
	gameValues: readonly (number | null)[] | undefined,
	maxRank: number,
): number[] {
	const values = gameValues?.slice(1, maxRank + 1)
	if (
		!values ||
		values.length !== maxRank ||
		values.some((value) => value === null)
	) {
		throw new Error(
			`rank stat ${rule.slot} ${rule.stat}: no "${rule.dataValue}" value per rank`,
		)
	}
	const scale = rule.scale ?? 1
	return (values as number[]).map(
		(value) => Math.round(value * scale * 10_000) / 10_000,
	)
}
