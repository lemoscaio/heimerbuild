import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

function levelPoint(page: Page, level: number) {
	return page.getByRole("group", { name: `Level ${level} point` })
}

test("the Skills tab spends any unspent level, edits a spent one and lists each ability per rank", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=9&skills=EQWEE")
	await page.getByRole("tab", { name: "Skills" }).click()
	await expect(page).toHaveURL(/[?&]tab=skills\b/)

	const level6 = levelPoint(page, 6)
	await expect(level6.getByRole("button", { pressed: true })).toHaveCount(0)
	await level6.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=EQWEEW\b/)

	// A later level, skipping level 7: it stays unspent.
	await levelPoint(page, 8).getByRole("button", { name: /^Q / }).click()
	await expect(page).toHaveURL(/[?&]skills=EQWEEW_Q\b/)
	await levelPoint(page, 2).getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=EWWEEW_Q\b/)

	await page.reload()
	await expect(
		levelPoint(page, 8).getByRole("button", { name: /^Q /, pressed: true }),
	).toBeVisible()
	await expect(
		levelPoint(page, 7).getByRole("button", { pressed: true }),
	).toHaveCount(0)
	await expect(
		page.getByRole("table", { name: "Noxious Trap per rank" }),
	).toBeVisible()
})

test.describe("on a phone", () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

	test("the Skills tab lists a row per level", async ({ page }) => {
		await page.goto("/champions/Teemo?lvl=4")
		await page.getByRole("tab", { name: "Skills" }).click()

		await levelPoint(page, 2).getByRole("button", { name: /^W / }).click()
		await expect(page).toHaveURL(/[?&]skills=_W\b/)
		await levelPoint(page, 1).getByRole("button", { name: /^Q / }).click()
		await expect(page).toHaveURL(/[?&]skills=QW\b/)
		await expect(levelPoint(page, 5)).toHaveCount(0)
	})
})
