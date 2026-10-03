import type { RichText, Rune } from "@schemas/rune"
import type { SummonerSpell } from "@schemas/summoner-spell"

type InteractionEffect = "moveSpeed" | "spellHaste" | "hexflash" | "spellSwap"

type SummonerRuneInteraction = {
	/** The rune's Data Dragon key. */
	runeKey: string
	/** The summoner spells it reacts to, by Riot key, or every spell. */
	spellKeys: "any" | readonly string[]
	effect: InteractionEffect
	/** Where the interaction is documented; its numbers are read from the patch's runes. */
	source: string
}

/**
 * The runes that react to summoner spells on Summoner's Rift. Grisly Mementos is left out: it only
 * gives Summoner Spell Haste in modes without vision trinkets.
 */
export const SUMMONER_RUNE_INTERACTIONS: readonly SummonerRuneInteraction[] = [
	{
		runeKey: "NimbusCloak",
		spellKeys: "any",
		effect: "moveSpeed",
		source: "https://wiki.leagueoflegends.com/en-us/Nimbus_Cloak",
	},
	{
		runeKey: "CosmicInsight",
		spellKeys: "any",
		effect: "spellHaste",
		source: "https://wiki.leagueoflegends.com/en-us/Cosmic_Insight",
	},
	{
		runeKey: "HextechFlashtraption",
		spellKeys: ["SummonerFlash"],
		effect: "hexflash",
		source: "https://wiki.leagueoflegends.com/en-us/Hextech_Flashtraption",
	},
	{
		runeKey: "UnsealedSpellbook",
		spellKeys: "any",
		effect: "spellSwap",
		source: "https://wiki.leagueoflegends.com/en-us/Unsealed_Spellbook",
	},
]

/** A rune of the page that reacts to the chosen summoner spells. */
export type RuneSummonerHint = {
	rune: Rune
	/** The chosen spells it reacts to. */
	spells: readonly SummonerSpell[]
	text: string
}

/** A rune of the page that reacts to one summoner spell. */
export type SpellRuneEffect = {
	rune: Rune
	text: string
	/** Reacts to this spell only (Hextech Flashtraption and Flash), not to every spell. */
	isSpellSpecific: boolean
}

const NIMBUS_SPEED = /(\d+)%\s*-\s*(\d+)%\s*Move Speed/i
const NIMBUS_DURATION = /lasts for (\d+(?:\.\d+)?)\s*s\b/i
const SPELL_HASTE = /\+(\d+)\s*Summoner Spell Haste/i
const FIRST_SWAP = /first swap becomes available at (\d+)\s*min/i

/** A cooldown after haste, as the game computes it: `cooldown × 100 / (100 + haste)`. */
export function hastedCooldown(cooldown: number, haste: number) {
	return (cooldown * 100) / (100 + haste)
}

/** Seconds until the spell is back: Smite's charge recharge, else its cooldown. */
export function spellCooldown(spell: SummonerSpell) {
	return spell.charges?.rechargeTime ?? spell.cooldown
}

function plainText(text: RichText) {
	return text
		.flatMap((paragraph) =>
			paragraph.map((line) => line.map((span) => span.text).join("")),
		)
		.join(" ")
}

function firstSentence(rune: Rune) {
	return rune.description.split("\n")[0]?.trim() || rune.description
}

/** The Summoner Spell Haste a rune gives, read from its description. */
export function runeSpellHaste(rune: Rune) {
	const match = SPELL_HASTE.exec(rune.description)
	return match ? Number(match[1]) : undefined
}

function hasteText(rune: Rune, spells: readonly SummonerSpell[]) {
	const haste = runeSpellHaste(rune)
	if (haste === undefined) return rune.description
	const cooldowns = spells.map((spell) => {
		const before = spellCooldown(spell)
		const after = Math.round(hastedCooldown(before, haste))
		const label = spells.length > 1 ? `${spell.name} ` : ""
		return `${label}${before} s → ${after} s`
	})
	return `+${haste} Summoner Spell Haste: ${cooldowns.join(" · ")}`
}

function moveSpeedText(rune: Rune) {
	const text = plainText(rune.longDescription)
	const speed = NIMBUS_SPEED.exec(text)
	const duration = NIMBUS_DURATION.exec(text)
	if (!speed || !duration) return rune.description
	return `After casting: +${speed[1]}–${speed[2]}% move speed for ${duration[1]} s, more for longer cooldowns`
}

function spellSwapText(rune: Rune) {
	const firstSwap = FIRST_SWAP.exec(plainText(rune.longDescription))
	const swap = firstSentence(rune)
	return firstSwap ? `${swap} First swap at ${firstSwap[1]} min.` : swap
}

function interactionText(
	effect: InteractionEffect,
	rune: Rune,
	spells: readonly SummonerSpell[],
) {
	switch (effect) {
		case "moveSpeed":
			return moveSpeedText(rune)
		case "spellHaste":
			return hasteText(rune, spells)
		case "hexflash":
			return firstSentence(rune)
		case "spellSwap":
			return spellSwapText(rune)
	}
}

function reactsTo(interaction: SummonerRuneInteraction, spell: SummonerSpell) {
	return (
		interaction.spellKeys === "any" || interaction.spellKeys.includes(spell.key)
	)
}

function interactionOf(rune: Rune) {
	return SUMMONER_RUNE_INTERACTIONS.find(
		(interaction) => interaction.runeKey === rune.key,
	)
}

/** The page's runes that react to the chosen spells, in page order, with what happens. */
export function runeSummonerHints(
	runes: readonly Rune[],
	spells: readonly SummonerSpell[],
): RuneSummonerHint[] {
	return runes.flatMap((rune) => {
		const interaction = interactionOf(rune)
		if (!interaction) return []
		const reacting = spells.filter((spell) => reactsTo(interaction, spell))
		if (!reacting.length) return []
		return [
			{
				rune,
				spells: reacting,
				text: interactionText(interaction.effect, rune, reacting),
			},
		]
	})
}

/** The page's runes that react to `spell`, with what happens for that spell. */
export function spellRuneEffects(
	runes: readonly Rune[],
	spell: SummonerSpell,
): SpellRuneEffect[] {
	return runes.flatMap((rune) => {
		const interaction = interactionOf(rune)
		if (!interaction || !reactsTo(interaction, spell)) return []
		return [
			{
				rune,
				text: interactionText(interaction.effect, rune, [spell]),
				isSpellSpecific: interaction.spellKeys !== "any",
			},
		]
	})
}

/** Each spell's reacting runes of the page, by spell id. */
export type SpellRuneEffectsById = ReadonlyMap<
	string,
	readonly SpellRuneEffect[]
>

/** `spellRuneEffects` for every spell a slot can take, by spell id. */
export function spellRuneEffectsById(
	runes: readonly Rune[],
	spells: readonly SummonerSpell[],
): SpellRuneEffectsById {
	return new Map(
		spells.map((spell) => [spell.id, spellRuneEffects(runes, spell)]),
	)
}
