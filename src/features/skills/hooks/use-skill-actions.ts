import type { AbilitySlot, ChampionAbilities } from "@schemas/champion"
import { useState } from "react"
import { track } from "@/lib/analytics/analytics"
import type { Skills } from "./use-skills"

/**
 * The skill point actions of the skills row and tab: each one changes the points, tells screen
 * readers what changed and is tracked.
 */
export function useSkillActions(skills: Skills, abilities: ChampionAbilities) {
	const [announcement, setAnnouncement] = useState("")

	function spellName(slot: AbilitySlot) {
		return abilities.spells.find((spell) => spell.slot === slot)?.name ?? slot
	}

	function spend(slot: AbilitySlot) {
		const level = skills.spendLevel(slot)
		if (!skills.ranks || level === undefined) return
		skills.spend(slot)
		setAnnouncement(
			`${spellName(slot)} rank ${skills.ranks[slot] + 1}, level ${level} point`,
		)
		track("skill_point_picked", { slot, level, via: "ability" })
	}

	function place(pointLevel: number, slot: AbilitySlot) {
		if (!skills.canPlace(pointLevel, slot)) return
		skills.place(pointLevel, slot)
		setAnnouncement(`Level ${pointLevel} point: ${spellName(slot)}`)
		track("skill_point_picked", { slot, level: pointLevel, via: "order" })
	}

	function fillRecommended() {
		const points = skills.unspentCount
		if (!points) return
		skills.fillRecommended()
		setAnnouncement(
			`${points} ${points === 1 ? "point" : "points"} spent with the recommended order`,
		)
		track("skill_order_recommended", { points })
	}

	function reset() {
		skills.reset()
		setAnnouncement("Skill points cleared")
		track("skill_order_reset", {})
	}

	return {
		/** The last change, for screen readers. */
		announcement,
		spend,
		place,
		fillRecommended,
		reset,
	}
}
