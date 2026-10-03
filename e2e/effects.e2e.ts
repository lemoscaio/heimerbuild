import { expect } from "@playwright/test"
import { levelSlider, statsPanel, test } from "./fixtures"

// Teemo at level 5 with W at rank 2: Move Quick's passive is on by default.
const TEEMO = "/champions/Teemo?lvl=5&skills=QWEQW"
const PASSIVE_OFF = /[?&]effects=-teemo-w-passive(?:&|$)/

test("a link's effect choices change the stats and stay through an edit, a reload and the recent builds", async ({
	page,
}) => {
	await page.goto(TEEMO)
	const stats = statsPanel(page)
	await expect(stats).toBeVisible()
	const withPassive = await stats.textContent()

	await page.goto(`${TEEMO}&effects=-teemo-w-passive`)
	await expect(stats).not.toHaveText(withPassive ?? "")

	await levelSlider(page).fill("6")
	await expect(page).toHaveURL(/[?&]lvl=6\b/)
	await expect(page).toHaveURL(PASSIVE_OFF)

	await page.reload()
	await expect(levelSlider(page)).toHaveValue("6")
	await expect(page).toHaveURL(PASSIVE_OFF)

	await page.goto("/")
	const recentBuild = page
		.getByRole("region", { name: "Your recent builds" })
		.getByRole("link")
	await expect(recentBuild).toHaveAttribute("href", PASSIVE_OFF)
})

test("a choice for an effect the build lacks is dropped on the next edit", async ({
	page,
}) => {
	await page.goto(`${TEEMO}&effects=ghost`)
	await expect(statsPanel(page)).toBeVisible()

	await levelSlider(page).fill("6")
	await expect(page).toHaveURL(/[?&]lvl=6\b/)
	await expect(page).not.toHaveURL(/[?&]effects=/)
})
