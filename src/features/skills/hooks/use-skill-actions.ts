import type { AbilitySlot, ChampionAbilities } from "@schemas/champion"
import { useState } from "react"
import { track } from "@/lib/analytics/analytics"
import { removeBlockerMessage } from "../lib/remove-blocker-message"
import type { RemoveBlocker } from "../lib/skill-history"
import type { Skills } from "./use-skills"

/**
 * The skill point actions of the skills row and tab: each one changes the points, tells screen
 * readers what changed and is tracked.
 */
export function useSkillActions(skills: Skills, abilities: ChampionAbilities) {
	const [announcement, setAnnouncement] = useState("")
	const [refusedLevel, setRefusedLevel] = useState<number>()
	const refusalBlocker =
		refusedLevel === undefined ? undefined : skills.removeBlocker(refusedLevel)

	function announce(message: string) {
		setAnnouncement(message)
		setRefusedLevel(undefined)
	}

	function refusalMessage(pointLevel: number, blocker: RemoveBlocker) {
		return `Level ${pointLevel} point kept. ${removeBlockerMessage(blocker)}`
	}

	function spellName(slot: AbilitySlot) {
		return abilities.spells.find((spell) => spell.slot === slot)?.name ?? slot
	}

	function spend(slot: AbilitySlot) {
		const level = skills.spendLevel(slot)
		if (!skills.ranks || level === undefined) return
		skills.spend(slot)
		announce(
			`${spellName(slot)} rank ${skills.ranks[slot] + 1}, level ${level} point`,
		)
		track("skill_point_picked", { slot, level, via: "ability" })
	}

	function place(pointLevel: number, slot: AbilitySlot) {
		if (!skills.canPlace(pointLevel, slot)) return
		skills.place(pointLevel, slot)
		announce(`Level ${pointLevel} point: ${spellName(slot)}`)
		track("skill_point_picked", { slot, level: pointLevel, via: "order" })
	}

	function remove(pointLevel: number) {
		const point = skills.levels[pointLevel - 1]
		if (point?.state !== "spent") return
		const blocker = skills.removeBlocker(pointLevel)
		if (blocker) {
			setAnnouncement(refusalMessage(pointLevel, blocker))
			setRefusedLevel(pointLevel)
			return
		}
		skills.remove(pointLevel)
		announce(`Level ${pointLevel} point removed`)
		track("skill_point_removed", { slot: point.slot, level: pointLevel })
	}

	function fillRecommended() {
		const points = skills.unspentCount
		if (!points) return
		skills.fillRecommended()
		announce(
			`${points} ${points === 1 ? "point" : "points"} spent with the recommended order`,
		)
		track("skill_order_recommended", { points })
	}

	function reset() {
		skills.reset()
		announce("Skill points cleared")
		track("skill_order_reset", {})
	}

	return {
		/** The last change, for screen readers. */
		announcement,
		/** Why the last removal was refused, while that point still cannot go. */
		refusal:
			refusedLevel !== undefined && refusalBlocker
				? refusalMessage(refusedLevel, refusalBlocker)
				: undefined,
		spend,
		place,
		remove,
		fillRecommended,
		reset,
	}
}
