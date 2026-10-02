import type { AbilitySlot, ChampionAbilities } from "@schemas/champion"
import { useState } from "react"
import { track } from "@/lib/analytics/analytics"
import type { Skills } from "./use-skills"

/**
 * The skills row's actions: each one changes the skill order, tells screen readers what changed
 * and is tracked.
 */
export function useSkillsRow(skills: Skills, abilities: ChampionAbilities) {
	const [announcement, setAnnouncement] = useState("")

	function spellName(slot: AbilitySlot) {
		return abilities.spells.find((spell) => spell.slot === slot)?.name ?? slot
	}

	function spend(slot: AbilitySlot) {
		if (!skills.ranks || skills.spendBlocker(slot)) return
		const level =
			skills.points.findIndex((point) => point.isAuto && point.slot !== slot) +
			1
		skills.spend(slot)
		setAnnouncement(`${spellName(slot)} rank ${skills.ranks[slot] + 1}`)
		track("skill_point_picked", { slot, level, via: "ability" })
	}

	function place(pointLevel: number, slot: AbilitySlot) {
		if (!skills.canPlace(pointLevel, slot)) return
		skills.place(pointLevel, slot)
		setAnnouncement(`Level ${pointLevel} point: ${spellName(slot)}`)
		track("skill_point_picked", { slot, level: pointLevel, via: "order" })
	}

	function reset() {
		skills.reset()
		setAnnouncement("Skill order back to the suggested one")
		track("skill_order_reset", {})
	}

	return {
		/** The last change, for screen readers. */
		announcement,
		spend,
		place,
		reset,
	}
}
