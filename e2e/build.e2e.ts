import { expect, type Page } from "@playwright/test"
import {
	chosenItems,
	itemNames,
	levelSlider,
	statsPanel,
	test,
} from "./fixtures"

function shopItem(page: Page, name: string) {
	return page
		.getByRole("region", { name: "Item shop" })
		.getByRole("button", { name, exact: true })
}

test("adding and removing items changes the totals, and a refused item is not added", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	const stats = statsPanel(page)
	await expect(shopItem(page, "Long Sword")).toBeVisible()
	const noItems = await stats.textContent()

	await shopItem(page, "Long Sword").click()
	await expect(chosenItems(page)).toHaveCount(1)
	await expect(stats).not.toHaveText(noItems ?? "")
	const withSword = await stats.textContent()

	await shopItem(page, "Rabadon's Deathcap").click()
	await expect(chosenItems(page)).toHaveCount(2)
	await expect(stats).not.toHaveText(withSword ?? "")
	const withBoth = await stats.textContent()

	// A build holds one copy of each legendary: the second one is refused with a notice.
	await shopItem(page, "Rabadon's Deathcap").click()
	await expect(page.getByRole("status").filter({ hasText: /\S/ })).toBeVisible()
	expect(await itemNames(chosenItems(page))).toEqual([
		"Remove Long Sword",
		"Remove Rabadon's Deathcap",
	])
	await expect(stats).toHaveText(withBoth ?? "")

	await page.getByRole("button", { name: "Remove Rabadon's Deathcap" }).click()
	await expect(chosenItems(page)).toHaveCount(1)
	await expect(stats).toHaveText(withSword ?? "")
})

test("a copied build link restores the same build in a new page", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"])
	await page.goto("/champions/Heimerdinger")
	await levelSlider(page).fill("13")
	await shopItem(page, "Long Sword").click()
	await shopItem(page, "Rabadon's Deathcap").click()
	await expect(chosenItems(page)).toHaveCount(2)
	const stats = await statsPanel(page).textContent()
	const items = await itemNames(chosenItems(page))

	await page.getByRole("button", { name: "Copy link" }).click()
	await expect(page.getByRole("status").filter({ hasText: /\S/ })).toBeVisible()
	const link = await page.evaluate(() => navigator.clipboard.readText())

	const shared = await context.newPage()
	await shared.goto(link)
	await expect(levelSlider(shared)).toHaveValue("13")
	await expect(chosenItems(shared)).toHaveCount(2)
	expect(await itemNames(chosenItems(shared))).toEqual(items)
	await expect(statsPanel(shared)).toHaveText(stats ?? "")
})
