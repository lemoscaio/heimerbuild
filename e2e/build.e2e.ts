import { expect, type Page } from "@playwright/test"
import {
	chosenItems,
	itemNames,
	levelSlider,
	settledText,
	statsPanel,
	test,
} from "./fixtures"

function shopItem(page: Page, name: string) {
	return page
		.getByRole("region", { name: "Item shop" })
		.getByRole("button", { name, exact: true })
}

test("a clicked item is previewed first and added with Add to build", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger?items=3020,3089,4645")
	const stats = statsPanel(page)
	await expect(chosenItems(page)).toHaveCount(3)
	await expect(stats).toBeVisible()
	const current = await settledText(stats)

	await shopItem(page, "Void Staff").click()
	await expect(page.getByRole("region", { name: "Void Staff" })).toBeVisible()
	await expect(stats).not.toHaveText(current ?? "")
	const preview = await settledText(stats)
	await expect(chosenItems(page)).toHaveCount(3)

	await page.getByRole("button", { name: "Add to build" }).click()
	await expect(chosenItems(page)).toHaveCount(4)
	await expect(page.getByRole("region", { name: "Void Staff" })).toHaveCount(0)
	await expect(stats).not.toHaveText(current ?? "")
	await expect(stats).not.toHaveText(preview ?? "")
})

test("keyboard: Add to build hands focus back to the item in the shop", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	const voidStaff = shopItem(page, "Void Staff")
	await voidStaff.focus()
	await page.keyboard.press("Enter")
	await page.getByRole("button", { name: "Add to build" }).focus()
	await page.keyboard.press("Enter")

	await expect(chosenItems(page)).toHaveCount(1)
	await expect(voidStaff).toBeFocused()
})

test("adding and removing items changes the totals, and a build the game forbids is kept with a warning", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	const stats = statsPanel(page)
	// Data Dragon is blocked: a tile shows its item's name in place of the icon.
	await expect(
		shopItem(page, "Long Sword").getByText("Long Sword"),
	).toBeVisible()
	const noItems = await settledText(stats)

	await shopItem(page, "Long Sword").dblclick()
	await expect(chosenItems(page)).toHaveCount(1)
	await expect(chosenItems(page).getByText("Long Sword")).toBeVisible()
	await expect(stats).not.toHaveText(noItems ?? "")
	const withSword = await settledText(stats)

	await shopItem(page, "Rabadon's Deathcap").dblclick()
	await expect(chosenItems(page)).toHaveCount(2)
	await expect(stats).not.toHaveText(withSword ?? "")
	const withBoth = await settledText(stats)

	// The game allows one Rabadon's Deathcap: the copy is added anyway and a warning names it.
	const warning = page.getByRole("status").filter({ hasText: /\S/ })
	await expect(warning).toHaveCount(0)
	await shopItem(page, "Rabadon's Deathcap").dblclick()
	expect(await itemNames(chosenItems(page))).toEqual([
		"Remove Long Sword",
		"Remove Rabadon's Deathcap",
		"Remove Rabadon's Deathcap",
	])
	await expect(stats).not.toHaveText(withBoth ?? "")
	await expect(warning).toContainText("Rabadon's Deathcap")

	await page
		.getByRole("button", { name: "Remove Rabadon's Deathcap" })
		.first()
		.click()
	await expect(chosenItems(page)).toHaveCount(2)
	await expect(stats).toHaveText(withBoth ?? "")
	await expect(warning).toHaveCount(0)

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
	await shopItem(page, "Long Sword").dblclick()
	await shopItem(page, "Rabadon's Deathcap").dblclick()
	await expect(chosenItems(page)).toHaveCount(2)
	const stats = await settledText(statsPanel(page))
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
