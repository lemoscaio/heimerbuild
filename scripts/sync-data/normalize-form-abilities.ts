import type {
	FormAbilityRule,
	FormDisplay,
	FormPassiveRule,
	FormSpellRule,
} from "./form-abilities"
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
	type ChampionAbilities,
	type ChampionPassive,
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

function iconUrl(spell: SpellObject, cdragonPatch: string, index = 0): string {
	const path = spell.mSpell?.mImgIconName?.[index]
	if (!path) throw new Error(`no icon ${index}`)
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

/** A game text's title and main text (`<titleLeft>Pow-Pow</titleLeft><mainText>…</mainText>`). */
export function modeText(markup: string | undefined): {
	title: string
	text: string
} {
	const part = (tag: string) =>
		new RegExp(`<${tag}>(.*?)</${tag}>`, "s").exec(markup ?? "")?.[1]
	const title = part("titleLeft")
	const text = part("mainText")
	if (!title || !text) throw new Error("no title and main text")
	return { title: plainText(title), text: plainText(text) }
}

type FormSpellContext = {
	/** The slot's ability in the default form, as normalized from Data Dragon. */
	defaultSpell: ChampionSpell
	/** The slot's spell object in the game files, by name ("JinxQ"). */
	slotSpell: string
	bin: Record<string, unknown>
	strings: GameStrings
	partype: string
	/** CommunityDragon's folder for the patch ("16.19"), for the icons. */
	cdragonPatch: string
}

/** The lines of `spell` named by `labels`, failing on a missing one. */
function pickLines(spell: ChampionSpell, labels: readonly string[]) {
	return labels.map((label) => {
		const line = spell.rankValues.find((value) => value.label === label)
		if (!line) throw new Error(`no "${label}" line`)
		return line
	})
}

/** How a form shows a slot whose ability stays: its icon, its lines, its mode's name and text. */
function applyDisplay(
	spell: ChampionSpell,
	display: FormDisplay,
	{
		source,
		strings,
		cdragonPatch,
		baseName,
	}: {
		source: SpellObject
		strings: GameStrings
		cdragonPatch: string
		baseName: string
	},
): ChampionSpell {
	const mode = display.modeText
		? modeText(strings(display.modeText.toLowerCase()))
		: undefined
	return {
		...spell,
		...(display.icon !== undefined && {
			icon: iconUrl(source, cdragonPatch, display.icon),
		}),
		...(display.lines && { rankValues: pickLines(spell, display.lines) }),
		...(mode && {
			name: `${baseName} (${mode.title})`,
			description: mode.text,
		}),
	}
}

/**
 * The other form's ability in the slot, and the default one as that form shows it: renamed to its
 * own part of a shared name, or with its own icon, lines and text when the ability stays.
 */
export function normalizeFormSpell(
	rule: FormSpellRule,
	{
		defaultSpell,
		slotSpell,
		bin,
		strings,
		partype,
		cdragonPatch,
	}: FormSpellContext,
): { defaultSpell: ChampionSpell; formSpell: ChampionSpell; skipped: number } {
	const spell = findSpellObject(bin, rule.spell)
	if (!spell) throw new Error(`no SpellObject ${rule.spell}`)
	const display = { source: spell, strings, cdragonPatch }

	// The same ability in both forms (Jinx's Switcheroo!): only its look changes.
	if (rule.spell.toLowerCase() === slotSpell.toLowerCase()) {
		const context = { ...display, baseName: defaultSpell.name }
		return {
			defaultSpell: applyDisplay(defaultSpell, rule.default ?? {}, context),
			formSpell: applyDisplay(defaultSpell, rule, context),
			skipped: 0,
		}
	}

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
		lines = pickLines(defaultSpell, rule.lines)
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
			icon: iconUrl(spell, cdragonPatch, rule.icon),
			maxRank,
			cooldown,
			cost,
			rankValues: lines,
		},
		skipped,
	}
}

/** The passive as each form shows it: the same passive, another icon (Jayce's hammer and cannon). */
function normalizeFormPassive(
	rule: FormPassiveRule,
	passive: ChampionPassive,
	{ bin, cdragonPatch }: Pick<FormSpellContext, "bin" | "cdragonPatch">,
): { defaultPassive: ChampionPassive; formPassive: ChampionPassive } {
	const spell = findSpellObject(bin, rule.spell)
	if (!spell) throw new Error(`no SpellObject ${rule.spell}`)
	const icon = (index: number | undefined) =>
		index === undefined ? passive.icon : iconUrl(spell, cdragonPatch, index)
	return {
		defaultPassive: { ...passive, icon: icon(rule.default?.icon) },
		formPassive: { ...passive, icon: icon(rule.icon) },
	}
}

/** The last part of each slot's spell in the character record ("JinxQAbility/JinxQ" is JinxQ). */
function slotSpellNames(bin: Record<string, unknown>): string[] {
	const root = Object.entries(bin).find(([path]) =>
		path.endsWith("/CharacterRecords/Root"),
	)?.[1] as { spellNames?: string[] } | undefined
	return (root?.spellNames ?? []).map((name) => name.split("/").at(-1) ?? name)
}

export type FormAbilitiesContext = Omit<
	FormSpellContext,
	"defaultSpell" | "slotSpell"
>

/**
 * Adds what each rule's form shows in each slot (`abilities.forms`): another ability, or the same
 * one with its own look; and the default form's look where Data Dragon's is not the game's. Pure.
 */
export function normalizeFormAbilities(
	abilities: ChampionAbilities,
	rules: readonly FormAbilityRule[],
	context: FormAbilitiesContext,
): { abilities: ChampionAbilities; skippedLines: number } {
	if (!rules.length) return { abilities, skippedLines: 0 }
	const spells = [...abilities.spells] as ChampionAbilities["spells"]
	let { passive } = abilities
	const forms: NonNullable<ChampionAbilities["forms"]> = {}
	const slotSpells = slotSpellNames(context.bin)
	let skippedLines = 0
	for (const rule of rules) {
		const formAbilities: NonNullable<ChampionAbilities["forms"]>[string] = {}
		const at = (where: string, run: () => void) => {
			try {
				run()
			} catch (error) {
				throw new Error(`${rule.form} ${where}: ${(error as Error).message}`, {
					cause: error,
				})
			}
		}
		if (rule.passive) {
			const passiveRule = rule.passive
			at("passive", () => {
				const normalized = normalizeFormPassive(passiveRule, passive, context)
				passive = normalized.defaultPassive
				formAbilities.passive = normalized.formPassive
			})
		}
		for (const [index, slot] of ABILITY_SLOTS.entries()) {
			const spellRule = rule.spells[slot]
			if (!spellRule) continue
			at(slot, () => {
				const normalized = normalizeFormSpell(spellRule, {
					...context,
					defaultSpell: spells[index],
					slotSpell: slotSpells[index] ?? "",
				})
				spells[index] = normalized.defaultSpell
				formAbilities[slot] = normalized.formSpell
				skippedLines += normalized.skipped
			})
		}
		forms[rule.form] = formAbilities
	}
	return { abilities: { ...abilities, passive, spells, forms }, skippedLines }
}
