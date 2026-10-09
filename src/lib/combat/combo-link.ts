import { ABILITY_SLOTS } from "@schemas/champion"
import type { SummonerSlot } from "../summoner-slots"
import {
	type CombatItem,
	MAX_COMBAT_STEPS,
	type OutcomeChoices,
	type OutcomeKey,
} from "./combat"
import { outcomeId, readOutcomeId } from "./outcomes"

/**
 * The combo as the link carries it (docs, "Link format"): its steps and markers (`combo`), free
 * mode (`free`) and free mode's choices (`choices`). Absent values are the defaults.
 */
export type ComboLink = {
	combo?: string
	free?: boolean
	choices?: string
}

const ID = "[a-z0-9]+(?:-[a-z0-9]+)*"
const SEPARATOR = "."
const ATTACK_TOKEN = "aa"
const MARKER_PREFIX = "m-"
const SUMMONER_KEYS = ["d", "f"] as const satisfies Record<SummonerSlot, string>
const SECONDS = "\\d{1,2}(?:_\\d{1,2})?"
// A time in the area (`e-1_5s`) is read before a variant id, which `2s` would also match.
const ABILITY_TOKEN = new RegExp(`^([qwer])(?:-(?:(${SECONDS})s|(${ID})))?$`)
const WAIT_TOKEN = new RegExp(`^t(${SECONDS})$`)
const MARKER_TOKEN = new RegExp(`^${MARKER_PREFIX}(${ID})$`)
const CHOICE_TOKEN = new RegExp(`^(\\d{1,2})([eacd])-(${ID})-([yn])$`)

const OUTCOME_CODES = {
	empowered: "e",
	"mark-applied": "a",
	"mark-consumed": "c",
	"damage-over-time": "d",
} as const satisfies Record<OutcomeKey["kind"], string>

/** Shape of the `target` value: a preset id (`tank`) or health, armor and magic resist (`1800-60-45`). */
export const TARGET_PARAM_PATTERN = /^(?:[a-z]+|\d{1,5}-\d{1,4}-\d{1,4})$/

/** Seconds with `_` as the decimal point: `1_5` is 1.5. */
function readSeconds(value: string): number {
	return Number(value.replace("_", "."))
}

function secondsToken(seconds: number): string {
	return String(seconds).replace(".", "_")
}

function abilityToken({
	slot,
	variant,
	inArea,
}: Extract<CombatItem, { kind: "ability" }>): string {
	const key = slot.toLowerCase()
	if (inArea !== undefined) return `${key}-${secondsToken(inArea)}s`
	return variant ? `${key}-${variant}` : key
}

function readItem(token: string): CombatItem | undefined {
	if (token === ATTACK_TOKEN) return { kind: "attack" }
	if (token === SUMMONER_KEYS[0]) return { kind: "summoner", slot: 0 }
	if (token === SUMMONER_KEYS[1]) return { kind: "summoner", slot: 1 }
	const [, key, inArea, variant] = ABILITY_TOKEN.exec(token) ?? []
	const slot = ABILITY_SLOTS.find((entry) => entry.toLowerCase() === key)
	if (slot) {
		if (inArea) return { kind: "ability", slot, inArea: readSeconds(inArea) }
		return variant
			? { kind: "ability", slot, variant }
			: { kind: "ability", slot }
	}
	const wait = WAIT_TOKEN.exec(token)?.[1]
	if (wait) return { kind: "wait", seconds: readSeconds(wait) }
	const marker = MARKER_TOKEN.exec(token)?.[1]
	return marker ? { kind: "situation", effectId: marker } : undefined
}

function itemToken(item: CombatItem): string {
	switch (item.kind) {
		case "attack":
			return ATTACK_TOKEN
		case "ability":
			return abilityToken(item)
		case "summoner":
			return SUMMONER_KEYS[item.slot]
		case "wait":
			return `t${secondsToken(item.seconds)}`
		case "situation":
			return `${MARKER_PREFIX}${item.effectId}`
	}
}

/** Reads `aa.q-handle.m-hail-of-blades.t1_5.d` into the combo's items; unreadable tokens are dropped, the rest capped at `MAX_COMBAT_STEPS`. */
export function readComboItems(value: string | undefined): CombatItem[] {
	if (!value) return []
	return value
		.split(SEPARATOR)
		.map(readItem)
		.filter((item) => item !== undefined)
		.slice(0, MAX_COMBAT_STEPS)
}

/** The `combo` value; `undefined` for an empty combo. */
export function serializeComboItems(
	items: readonly CombatItem[],
): string | undefined {
	return items.length ? items.map(itemToken).join(SEPARATOR) : undefined
}

function outcomeKey(code: string, name: string): OutcomeKey | undefined {
	switch (code) {
		case "e":
			return { kind: "empowered", effectId: name }
		case "a":
			return { kind: "mark-applied", mark: name }
		case "c":
			return { kind: "mark-consumed", mark: name }
		case "d":
			return { kind: "damage-over-time", effectId: name }
		default:
			return undefined
	}
}

/**
 * Reads `3e-hail-of-blades-n.5c-quinn-harrier-y` into free mode's choices by item index (0 first):
 * the step's position in `combo` (1 first), the outcome and the answer. Unreadable tokens are dropped.
 */
export function readComboChoices(
	value: string | undefined,
): Record<number, OutcomeChoices> {
	const byItem: Record<number, Record<string, boolean>> = {}
	for (const token of value?.split(SEPARATOR) ?? []) {
		const match = CHOICE_TOKEN.exec(token)
		if (!match) continue
		const [, position, code = "", name = "", answer] = match
		const index = Number(position) - 1
		const key = outcomeKey(code, name)
		if (index < 0 || index >= MAX_COMBAT_STEPS || !key) continue
		byItem[index] = { ...byItem[index], [outcomeId(key)]: answer === "y" }
	}
	return byItem
}

/** The `choices` value from the choices by item, in item order; `undefined` for none. */
export function serializeComboChoices(
	byItem: readonly (OutcomeChoices | undefined)[],
): string | undefined {
	const tokens = byItem.flatMap((choices, index) =>
		Object.entries(choices ?? {}).flatMap(([id, happened]) => {
			const key = readOutcomeId(id)
			if (!key) return []
			const name = "mark" in key ? key.mark : key.effectId
			const answer = happened ? "y" : "n"
			return [`${index + 1}${OUTCOME_CODES[key.kind]}-${name}-${answer}`]
		}),
	)
	return tokens.length ? tokens.join(SEPARATOR) : undefined
}

/** The `choices` value as read, written back: unreadable tokens dropped. */
export function normalizeComboChoices(value: string): string | undefined {
	const byItem = readComboChoices(value)
	const last = Math.max(-1, ...Object.keys(byItem).map(Number))
	return serializeComboChoices(
		Array.from({ length: last + 1 }, (_, index) => byItem[index]),
	)
}
