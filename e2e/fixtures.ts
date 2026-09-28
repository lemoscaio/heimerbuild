import {
	type APIRequestContext,
	test as base,
	type Locator,
	type Page,
} from "@playwright/test"
import { type Item, ItemsFileSchema } from "../scripts/sync-data/schemas/item"
import { dataManifestSchema } from "../scripts/sync-data/schemas/manifest"

/** Every flow runs with Data Dragon blocked: behavior must never depend on icons loading. */
export const test = base.extend({
	context: async ({ context }, use) => {
		await context.route(/^https:\/\/ddragon\.leagueoflegends\.com\//, (route) =>
			route.abort(),
		)
		await use(context)
	},
})

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
