import {
	type APIRequestContext,
	test as base,
	expect,
	type Locator,
	type Page,
} from "@playwright/test"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { dataManifestSchema } from "@schemas/manifest"

/**
 * Every flow runs with Data Dragon blocked (behavior must never depend on icons loading; the block
 * is in playwright.config.ts) and marked as E2E, so the app never starts Sentry or PostHog
 * (src/app/should-init-telemetry.ts). A flow fails if anything still reaches PostHog or its proxy.
 */
export const test = base.extend({
	context: async ({ context }, use) => {
		await context.addInitScript(() => {
			Object.assign(window, { __HB_E2E__: true })
		})
		const analyticsRequests: string[] = []
		context.on("request", (request) => {
			const { hostname, pathname } = new URL(request.url())
			if (
				pathname.startsWith("/ingest/") ||
				hostname.endsWith(".posthog.com")
			) {
				analyticsRequests.push(request.url())
			}
		})
		await use(context)
		expect(analyticsRequests, "E2E runs must not send analytics").toEqual([])
	},
})

/**
 * A locator's text once it stops changing. The Stats panel's numbers count to each new value
 * (about 200 ms), so a text read right after an edit or a data load can catch them halfway.
 */
export async function settledText(locator: Locator) {
	let text = await locator.textContent()
	for (;;) {
		await locator.page().waitForTimeout(300)
		const next = await locator.textContent()
		if (next === text) return text
		text = next
	}
}

export function statsPanel(page: Page) {
	return page.getByRole("region", { name: "Champion stats" })
}

export function shopItems(page: Page) {
	return page.getByRole("region", { name: "Item shop" }).getByRole("button")
}

export function chosenItems(page: Page) {
	return page.getByRole("group", { name: "Chosen items" }).getByRole("button")
}

export function levelSlider(page: Page) {
	return page.getByRole("slider", { name: "Champion level" })
}

/** Accessible names of the item buttons (their icons are decorative). */
export function itemNames(buttons: Locator) {
	return buttons.evaluateAll((elements) =>
		elements.map((element) => element.getAttribute("aria-label") ?? ""),
	)
}

/** The current patch's items as the site serves them, to check the shop against real data. */
export async function currentItems(
	request: APIRequestContext,
): Promise<Item[]> {
	const manifest = dataManifestSchema.parse(
		await (await request.get("/data/manifest.json")).json(),
	)
	const file = `${manifest.currentPatch}/items.json`
	const response = await request.get(`/data/${file}?v=${manifest.files[file]}`)
	return ItemsFileSchema.parse(await response.json()).items
}
