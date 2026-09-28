import { expect } from "@playwright/test"
import { levelSlider, statsPanel, test } from "./fixtures"

test("search filters the champion grid", async ({ page }) => {
	await page.goto("/")
	const search = page.getByRole("searchbox", { name: "Search a champion" })
	const champions = page.getByRole("main").getByRole("link")
	await expect(champions.first()).toBeVisible()
	const total = await champions.count()
	expect(total).toBeGreaterThan(1)

	await search.fill("heimer")
	await expect(champions).toHaveCount(1)
	await expect(champions).toHaveAccessibleName("Heimerdinger")

	await search.fill("")
	await expect(champions).toHaveCount(total)
})

test("opening a champion and changing its level changes its stats", async ({
	page,
}) => {
	await page.goto("/")
	await page
		.getByRole("searchbox", { name: "Search a champion" })
		.fill("Heimerdinger")
	await page.getByRole("link", { name: "Heimerdinger" }).click()

	await expect(page).toHaveURL(/\/champions\/Heimerdinger/)
	const stats = statsPanel(page)
	await expect(stats).toBeVisible()
	await expect(levelSlider(page)).toHaveValue("1")
	const levelOneStats = await stats.textContent()

	await levelSlider(page).fill("18")

	await expect(levelSlider(page)).toHaveValue("18")
	await expect(stats).not.toHaveText(levelOneStats ?? "")
})
