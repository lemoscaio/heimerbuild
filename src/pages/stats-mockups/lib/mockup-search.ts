import * as z from "zod/mini"
import { MOCKUP_BUILD_IDS } from "./mockup-builds"

export const MOCKUP_OPTIONS = ["expand", "columns", "bars"] as const

export type MockupOption = (typeof MOCKUP_OPTIONS)[number]

/** The prototype's state in its URL, so each screenshot is a link. Invalid values are dropped. */
const mockupSearchSchema = z.object({
	build: z.catch(z.optional(z.enum(MOCKUP_BUILD_IDS)), undefined),
	form: z.catch(
		z.optional(z.string().check(z.regex(/^[a-z]+(?:-[a-z]+)*$/))),
		undefined,
	),
	preview: z.catch(z.optional(z.boolean()), undefined),
	/** The option shown below `lg`; wider screens show all three side by side. */
	option: z.catch(z.optional(z.enum(MOCKUP_OPTIONS)), undefined),
})

export type MockupSearch = z.infer<typeof mockupSearchSchema>

export function readMockupSearch(
	search: Record<string, unknown>,
): MockupSearch {
	return mockupSearchSchema.parse(search)
}
