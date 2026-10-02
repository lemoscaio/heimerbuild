import { expect, type Page } from "@playwright/test"
import { levelSlider, statsPanel, test } from "./fixtures"

function skills(page: Page) {
	return page.getByRole("region", { name: "Skills" })
}

function ability(page: Page, name: string) {
	return skills(page).getByRole("button", { name: new RegExp(`^${name} `) })
}

function orderLevel(page: Page, level: number) {
	return skills(page).getByRole("button", {
		name: new RegExp(`^Level ${level}: `),
	})
}

test("spent skill points go in the link, and lowering the level keeps them for when it rises", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=3")
	await expect(orderLevel(page, 3)).toBeVisible()

	await ability(page, "Blinding Dart").click()
	await expect(page).toHaveURL(/[?&]skills=Q\b/)
	await ability(page, "Toxic Shot").hover()
	await expect(page.getByRole("tooltip", { name: /^Toxic Shot/ })).toBeVisible()
	await ability(page, "Toxic Shot").press("Enter")
	await expect(page).toHaveURL(/[?&]skills=QEE\b/)

	const slider = levelSlider(page)
	await slider.focus()
	await slider.press("ArrowLeft")
	await slider.press("ArrowLeft")
	await expect(page).toHaveURL(/[?&]skills=Q\b/)
	await slider.press("ArrowRight")
	await slider.press("ArrowRight")
	await expect(page).toHaveURL(/[?&]skills=QEE\b/)

	// A different pick below the kept points drops them, like browser history.
	await slider.press("ArrowLeft")
	await slider.press("ArrowLeft")
	await orderLevel(page, 1).click()
	await page.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=W\b/)
	await slider.focus()
	await slider.press("ArrowRight")
	await slider.press("ArrowRight")
	await expect(page).toHaveURL(/[?&]lvl=3\b/)
	await expect(page).toHaveURL(/[?&]skills=W\b/)
})

test("a rank that grants stats changes the stats panel", async ({ page }) => {
	await page.goto("/champions/TwistedFate?lvl=3&skills=QWQ")
	const stats = statsPanel(page)
	await expect(stats).toBeVisible()
	const before = await stats.textContent()

	await orderLevel(page, 3).click()
	await page.getByRole("button", { name: /^E / }).click()
	await expect(page).toHaveURL(/[?&]skills=QWE\b/)
	await expect(stats).not.toHaveText(before ?? "")
})

test("a link's invalid points become automatic, and reset drops every pick", async ({
	page,
}) => {
	// Q cannot reach rank 2 at level 2: only the first point is kept.
	await page.goto("/champions/Teemo?lvl=6&skills=QQ")
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/picked/)
	await expect(orderLevel(page, 2)).toHaveAccessibleName(/automatic/)

	await orderLevel(page, 2).click()
	await page.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=QW\b/)

	await skills(page).getByRole("button", { name: "Reset to auto" }).click()
	await expect(page).not.toHaveURL(/[?&]skills=/)
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/automatic/)
})
