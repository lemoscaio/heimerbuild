import type { EffectOverrides } from "./effect"

const ID = "[a-z0-9]+(?:-[a-z0-9]+)*"
const OFF_MARK = "-"
const SEPARATOR = ","

/** Shape of the `effects` URL value: effect ids turned on, `-`-prefixed ids turned off. */
export const EFFECTS_PARAM_PATTERN = new RegExp(
	`^${OFF_MARK}?${ID}(?:${SEPARATOR}${OFF_MARK}?${ID})*$`,
)

/** Reads `ghost,-teemo-w-passive` as `{ ghost: true, "teemo-w-passive": false }`; no or an unreadable value as none. */
export function parseEffectOverrides(
	value: string | undefined,
): EffectOverrides | undefined {
	if (!value || !EFFECTS_PARAM_PATTERN.test(value)) return undefined
	return Object.fromEntries(
		value
			.split(SEPARATOR)
			.map((entry) =>
				entry.startsWith(OFF_MARK)
					? [entry.slice(OFF_MARK.length), false]
					: [entry, true],
			),
	)
}

/** The `effects` URL value; `undefined` when no effect differs from its default. */
export function serializeEffectOverrides(
	overrides: EffectOverrides | undefined,
): string | undefined {
	const entries = Object.entries(overrides ?? {})
	if (!entries.length) return undefined
	return entries
		.map(([id, on]) => (on ? id : `${OFF_MARK}${id}`))
		.join(SEPARATOR)
}
