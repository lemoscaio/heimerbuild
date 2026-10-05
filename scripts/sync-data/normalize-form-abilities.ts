import type { FormAbilityRule, FormSpellRule } from "./form-abilities"
import {
	findSpellObject,
	type Leveltip,
	plainText,
	rankValues,
	round,
	type SpellObject,
	spellValues,
} from "./normalize-abilities"
import {
	ABILITY_SLOTS,
	type AbilitySlot,
	type ChampionAbilities,
	type ChampionSpell,
} from "./schemas/champion"

const CDRAGON_RAW = "https://raw.communitydragon.org"
const NO_COST = { text: "No Cost" } as const

/** The game's text by lowercase key, from CommunityDragon's `lol.stringtable.json`. */
export type GameStrings = (key: string) => string | undefined

/**
 * The rank-up lines the client generates for a spell (`<postScriptLeft>Damage<br>…`,
 * `<postScriptRight>@BaseDamage@ -> @BaseDamageNL@<br>…`), in Data Dragon's `leveltip` shape.
 */
export function levelUpTip(markup: string | undefined): Leveltip {
	const part = (tag: string) =>
		new RegExp(`<${tag}>(.*?)</${tag}>`, "s").exec(markup ?? "")?.[1] ?? ""
	const lines = (text: string) => (text ? text.split(/<br\s*\/?>/i) : [])
	return {
		label: lines(part("postScriptLeft")),
		effect: lines(part("postScriptRight")).map((effect) =>
			effect.replace(/@([^@]+)@/g, "{{ $1 }}"),
		),
	}
}

/**
 * Riot names a slot both forms share after both, the default form's first ("To the Skies! / Shock
 * Blast"), and the other form's spell the other way round ("Boulder Toss / Boomerang Throw").
 */
export function formSpellNames(
	defaultName: string,
	ownName: string | undefined,
): { defaultName: string; formName: string } {
	const [first = defaultName, second] = defaultName.split(" / ")
	const formName = ownName?.split(" / ")[0] ?? second
	if (!formName) throw new Error(`no name for the form of "${defaultName}"`)
	return { defaultName: second ? first : defaultName, formName }
}

/** "Hammer Stance: …\n\nCannon Stance: …": one paragraph per form, the default form's first. */
function descriptionParts(description: string): [string, string] {
	const parts = description.split("\n\n")
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new Error(`expected one paragraph per form in "${description}"`)
	}
	return [parts[0], parts[1]]
}

function iconUrl(spell: SpellObject, cdragonPatch: string): string {
	const path = spell.mSpell?.mImgIconName?.[0]
	if (!path) throw new Error("no icon")
	const png = path.toLowerCase().replace(/\.dds$/, ".png")
	return `${CDRAGON_RAW}/${cdragonPatch}/game/${png}`
}

function cooldownPerRank(spell: SpellObject, maxRank: number): number[] {
	const ranks = spell.mSpell?.cooldownTime?.slice(1, maxRank + 1)
	if (ranks?.length !== maxRank || ranks.some((value) => value === null)) {
		throw new Error("no cooldown per rank")
	}
	return (ranks as number[]).map(round)
}

/** Mana per rank, or No Cost when the spell costs nothing (Cougar Nidalee, Spider Elise). */
function costPerRank(
	spell: SpellObject,
	{ maxRank, partype }: { maxRank: number; partype: string },
): NonNullable<ChampionSpell["cost"]> {
	const mana = spell.mSpell?.mana
	if (!mana?.some((value) => value > 0)) return NO_COST
	if (mana.length < maxRank) throw new Error("no mana cost per rank")
	return { values: mana.slice(0, maxRank).map(round), unit: partype }
}

type FormSpellContext = {
	/** The slot's ability in the default form, as normalized from Data Dragon. */
	defaultSpell: ChampionSpell
	bin: Record<string, unknown>
	strings: GameStrings
	partype: string
	/** CommunityDragon's folder for the patch ("16.19"), for the icons. */
	cdragonPatch: string
}

/** The other form's ability in the slot, and the default one renamed to its own part of the shared name. */
export function normalizeFormSpell(
	rule: FormSpellRule,
	{ defaultSpell, bin, strings, partype, cdragonPatch }: FormSpellContext,
): { defaultSpell: ChampionSpell; formSpell: ChampionSpell; skipped: number } {
	const spell = findSpellObject(bin, rule.spell)
	if (!spell) throw new Error(`no SpellObject ${rule.spell}`)
	const tooltip = spell.mSpell?.mClientData?.mTooltipData
	const nameKey = tooltip?.mLocKeys?.keyName?.toLowerCase()
	const summaryKey = tooltip?.mLocKeys?.keySummary?.toLowerCase()
	const names = formSpellNames(defaultSpell.name, nameKey && strings(nameKey))
	const [defaultDescription, formDescription] = rule.splitDescription
		? descriptionParts(defaultSpell.description)
		: [defaultSpell.description, defaultSpell.description]
	const summary = summaryKey && strings(summaryKey)
	const { maxRank } = defaultSpell
	const cooldown = cooldownPerRank(spell, maxRank)
	const cost = costPerRank(spell, { maxRank, partype })

	let lines: ChampionSpell["rankValues"]
	let skipped = 0
	if (rule.lines) {
		lines = rule.lines.map((label) => {
			const line = defaultSpell.rankValues.find(
				(value) => value.label === label,
			)
			if (!line) throw new Error(`${rule.spell}: no "${label}" line`)
			return line
		})
	} else {
		const objectName = (tooltip?.mObjectName ?? rule.spell).toLowerCase()
		const tip = levelUpTip(
			strings(`generatedtip_spell_${objectName}_tooltipleveluplist`),
		)
		;({ lines, skipped } = rankValues(tip, {
			maxRank,
			cooldown,
			cost: "values" in cost ? cost.values : [],
			values: spellValues(spell),
			partype,
		}))
	}

	return {
		defaultSpell: {
			...defaultSpell,
			name: names.defaultName,
			description: defaultDescription,
		},
		formSpell: {
			slot: defaultSpell.slot,
			name: names.formName,
			description: summary ? plainText(summary) : formDescription,
			icon: iconUrl(spell, cdragonPatch),
			maxRank,
			cooldown,
			cost,
			rankValues: lines,
		},
		skipped,
	}
}

export type FormAbilitiesContext = Omit<FormSpellContext, "defaultSpell">

/**
 * Adds the abilities each rule's form swaps in (`abilities.forms`) and renames the default ones to
 * their own part of the shared name. Pure.
 */
export function normalizeFormAbilities(
	abilities: ChampionAbilities,
	rules: readonly FormAbilityRule[],
	context: FormAbilitiesContext,
): { abilities: ChampionAbilities; skippedLines: number } {
	if (!rules.length) return { abilities, skippedLines: 0 }
	const spells = [...abilities.spells] as ChampionAbilities["spells"]
	const forms: NonNullable<ChampionAbilities["forms"]> = {}
	let skippedLines = 0
	for (const rule of rules) {
		const formSpells: Partial<Record<AbilitySlot, ChampionSpell>> = {}
		for (const [index, slot] of ABILITY_SLOTS.entries()) {
			const spellRule = rule.spells[slot]
			if (!spellRule) continue
			try {
				const normalized = normalizeFormSpell(spellRule, {
					...context,
					defaultSpell: spells[index],
				})
				spells[index] = normalized.defaultSpell
				formSpells[slot] = normalized.formSpell
				skippedLines += normalized.skipped
			} catch (error) {
				throw new Error(`${rule.form} ${slot}: ${(error as Error).message}`, {
					cause: error,
				})
			}
		}
		forms[rule.form] = formSpells
	}
	return { abilities: { ...abilities, spells, forms }, skippedLines }
}
