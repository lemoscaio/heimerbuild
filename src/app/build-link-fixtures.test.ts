import { describe, expect, test } from "bun:test"
import { defaultParseSearch } from "@tanstack/react-router"
import { BUILD_LINK_VERSION } from "@/features/build-calculator/lib/build-link-migrations"
import {
	type BuildSearch,
	readBuildSearch,
	toBuildSearch,
} from "@/features/build-calculator/lib/build-search"
import { parseEffectOverrides } from "@/lib/effects/effect-overrides"
import { parseMatchStacks } from "@/lib/effects/match-stacks"
import { MIN_LEVEL } from "@/lib/stats/growth"
import { stringifySearch } from "./search-params"

type LinkFixture = {
	name: string
	/** A real link search copied from the app before links had a version (v1). */
	link: string
	/** The build it opens, in the latest format. */
	build: BuildSearch
}

// A format change adds a migration and keeps these opening the same build (docs, "Link format").
const v1Links: LinkFixture[] = [
	{
		name: "items, rune page, skill points and the Skills tab",
		link: "?lvl=6&items=3089%2C3020&tab=skills&runes=8200-8229-0-0-0_8300-8304-8347_5008-0-0&skills=EQWQ",
		build: {
			v: BUILD_LINK_VERSION,
			lvl: 6,
			items: ["3089", "3020"],
			tab: "skills",
			runes: "8200-8229-0-0-0_8300-8304-8347_5008-0-0",
			skills: "EQWQ",
		},
	},
	{
		name: "a copied link pinned to its patch, on the Runes tab",
		link: "?lvl=6&items=3089%2C3020&patch=16.19.1&tab=runes&runes=8200-8229-0-0-0_8300-8304-8347_5008-0-0&skills=EQWQ",
		build: {
			v: BUILD_LINK_VERSION,
			lvl: 6,
			items: ["3089", "3020"],
			patch: "16.19.1",
			tab: "runes",
			runes: "8200-8229-0-0-0_8300-8304-8347_5008-0-0",
			skills: "EQWQ",
		},
	},
	{
		name: "a form in the expanded shop",
		link: "?lvl=11&items=1036&view=shop&form=mega",
		build: {
			v: BUILD_LINK_VERSION,
			lvl: 11,
			items: ["1036"],
			view: "shop",
			form: "mega",
		},
	},
	{
		name: "summoner spells",
		link: "?lvl=9&summoners=14%2C4",
		build: { v: BUILD_LINK_VERSION, lvl: 9, summoners: "14,4" },
	},
	{
		name: "effects",
		link: "?lvl=9&summoners=6%2C4&effects=ghost%2C-teemo-w-passive",
		build: {
			v: BUILD_LINK_VERSION,
			lvl: 9,
			summoners: "6,4",
			effects: "ghost,-teemo-w-passive",
		},
	},
	{
		name: "a combo with a marker, a variant, a wait, free mode's answer and a target, on the Combo tab",
		link: "?lvl=9&patch=16.19.1&tab=combo&runes=8100-9923-0-0-0_0-0-0_0-0-0&skills=QWEQQRQEQ&combo=m-hail-of-blades.aa.aa.q-handle.t1_5&free=1&choices=2e-hail-of-blades-n&target=2500-60-45",
		build: {
			v: BUILD_LINK_VERSION,
			lvl: 9,
			patch: "16.19.1",
			tab: "combo",
			runes: "8100-9923-0-0-0_0-0-0_0-0-0",
			skills: "QWEQQRQEQ",
			combo: "m-hail-of-blades.aa.aa.q-handle.t1_5",
			free: 1,
			choices: "2e-hail-of-blades-n",
			target: "2500-60-45",
		},
	},
	{
		name: "Siphoning Strike's stacks on each Q step, which v2 keeps as the build's",
		link: "?lvl=9&patch=16.19.1&tab=combo&skills=QWEQQRQEQ&combo=q-100.aa.q-100",
		build: {
			v: BUILD_LINK_VERSION,
			lvl: 9,
			patch: "16.19.1",
			tab: "combo",
			skills: "QWEQQRQEQ",
			combo: "q.aa.q",
			stacks: "siphoning-strike-100",
		},
	},
]

function openLink(link: string) {
	return readBuildSearch(defaultParseSearch(link))
}

/** The link the app writes for a build it read, as the build source does. */
function writeLink({
	lvl,
	items,
	effects,
	free,
	stacks,
	...search
}: BuildSearch) {
	return stringifySearch(
		toBuildSearch({
			...search,
			effects: parseEffectOverrides(effects),
			matchStacks: parseMatchStacks(stacks),
			free: free === 1,
			patch: search.patch,
			level: lvl ?? MIN_LEVEL,
			itemIds: items ?? [],
		}),
	)
}

describe.each(v1Links)("a v1 link with $name", ({ link, build }) => {
	test("opens the same build without a version", () => {
		expect(openLink(link)).toEqual(build)
	})

	test("opens the same build with v=1", () => {
		expect(openLink(`${link}&v=1`)).toEqual(build)
	})

	test("is written back in the current version and still opens the same build", () => {
		const written = writeLink(openLink(link))
		expect(written).toEndWith(`&v=${BUILD_LINK_VERSION}`)
		expect(openLink(written)).toEqual(build)
	})
})

describe("a v2 link keeps its Q variants and stacks as written", () => {
	const link = "?lvl=9&combo=q-100&stacks=siphoning-strike-250&v=2"

	test("opens without a migration", () => {
		expect(openLink(link)).toMatchObject({
			combo: "q-100",
			stacks: "siphoning-strike-250",
		})
	})
})

// Unspent levels inside `skills` (`_`) are a new accepted value of v1, so no version bump.
describe("a v1 link with unspent skill levels", () => {
	const link = "?lvl=9&skills=Q_Q_W&v=1"
	const build: BuildSearch = { v: BUILD_LINK_VERSION, lvl: 9, skills: "Q_Q_W" }

	test("opens with its gaps", () => {
		expect(openLink(link)).toEqual(build)
	})

	test("is written back with the same gaps", () => {
		expect(openLink(writeLink(openLink(link)))).toEqual(build)
	})
})
