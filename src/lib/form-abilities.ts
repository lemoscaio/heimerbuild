import type { AbilitySlot, ChampionAbilities } from "@schemas/champion"

/** A champion's abilities as far as forms go: the default form's spells and the ones each form swaps in. */
type FormAbilities<Spell extends { slot: AbilitySlot }> = {
	spells: readonly Spell[]
	forms?: Readonly<Record<string, Partial<Record<AbilitySlot, Spell>>>>
}

/** The ability in `slot` in the form `formId`: the form's own (Cannon Jayce's Shock Blast), else the default one. */
export function spellInForm<Spell extends { slot: AbilitySlot }>(
	abilities: FormAbilities<Spell>,
	slot: AbilitySlot,
	formId: string | undefined,
): Spell | undefined {
	return (
		(formId ? abilities.forms?.[formId]?.[slot] : undefined) ??
		abilities.spells.find((spell) => spell.slot === slot)
	)
}

/** The abilities as the form `formId` shows them, passive included; absent or unknown means the default form. Ranks stay per slot. */
export function abilitiesInForm(
	abilities: ChampionAbilities,
	formId: string | undefined,
): ChampionAbilities {
	const formSpells = formId ? abilities.forms?.[formId] : undefined
	if (!formSpells) return abilities
	const [q, w, e, r] = abilities.spells
	return {
		...abilities,
		passive: formSpells.passive ?? abilities.passive,
		spells: [
			formSpells.Q ?? q,
			formSpells.W ?? w,
			formSpells.E ?? e,
			formSpells.R ?? r,
		],
	}
}
