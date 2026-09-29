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
	await page
		.getByRole("region", { name: "Item shop" })
		.getByRole("button", { name: "Long Sword", exact: true })
		.click()
	await page.getByRole("button", { name: "Add to build" }).click()
	await expect(chosenItems(page)).toHaveCount(1)

	await page.getByRole("tab", { name: "Stats" }).click()
	await expect(stats).toBeVisible()
	await expect(stats).not.toHaveText(before ?? "")
})
