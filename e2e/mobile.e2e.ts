import { expect } from "@playwright/test"
import { chosenItems, statsPanel, test } from "./fixtures"

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test("on a phone, an item added from the Shop tab changes the Stats tab", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	const stats = statsPanel(page)
	await expect(stats).toBeVisible()
	const before = await stats.textContent()

	await page.getByRole("tab", { name: "Shop" }).click()
	await expect(stats).toBeHidden()
	await expect(
		page.getByRole("group", { name: "Match selected stats" }),
	).toBeVisible()
	await page.getByRole("combobox", { name: "Search items" }).fill("long sword")
	await page.keyboard.press("Escape")
	const shop = page.getByRole("region", { name: "Item shop" })
	await expect(shop.getByRole("button")).toHaveCount(1)
	await shop.getByRole("button", { name: "Long Sword", exact: true }).click()
	await page.getByRole("button", { name: "Add to build" }).click()
	await expect(chosenItems(page)).toHaveCount(1)

	await page.getByRole("tab", { name: "Stats" }).click()
	await expect(stats).toBeVisible()
	await expect(stats).not.toHaveText(before ?? "")
})
