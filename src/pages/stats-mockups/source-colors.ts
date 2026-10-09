import { cva } from "class-variance-authority"
import type { SourceKind } from "./lib/source-summary"

/** One color per kind of source, shared by the bars and their legend. */
export const sourceColor = cva("", {
	variants: {
		kind: {
			base: "bg-line-strong",
			level: "bg-subtle",
			form: "bg-physical",
			item: "bg-gold",
			shards: "bg-lilac",
			ranks: "bg-magic",
			effect: "bg-health",
			preview:
				"bg-[repeating-linear-gradient(135deg,var(--color-lilac)_0_3px,transparent_3px_6px)]",
		} satisfies Record<SourceKind, string>,
	},
})
