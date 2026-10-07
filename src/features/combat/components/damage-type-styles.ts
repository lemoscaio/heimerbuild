import type { DamageType } from "@schemas/champion"
import { cva } from "class-variance-authority"

const text = cva("", {
	variants: {
		type: {
			physical: "text-physical",
			magic: "text-magic",
			true: "text-true-damage",
		},
	},
})

const fill = cva("", {
	variants: {
		type: {
			physical: "bg-physical",
			magic: "bg-magic",
			true: "bg-true-damage",
		},
	},
})

// cva types a "true" key as a boolean variant.
function variant(type: DamageType) {
	return type === "true" || type
}

/** A damage type's color as text: never shown alone, always next to its type's name. */
export function damageTypeText(type: DamageType) {
	return text({ type: variant(type) })
}

/** The same colors as a fill (a bar segment, a legend swatch). */
export function damageTypeFill(type: DamageType) {
	return fill({ type: variant(type) })
}
