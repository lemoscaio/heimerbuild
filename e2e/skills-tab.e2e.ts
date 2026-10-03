import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

function levelPoint(page: Page, level: number) {
	return page.getByRole("group", { name: `Level ${level} point` })
}

test("the Skills tab spends the next point, edits any spent one and lists each ability per rank", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=9&skills=EQWEE")
	await page.getByRole("tab", { name: "Skills" }).click()
	await expect(page).toHaveURL(/[?&]tab=skills\b/)

	// Level 6 is the next point: nothing is chosen, and a later level waits for it.
	const level6 = levelPoint(page, 6)
	await expect(level6.getByRole("button", { pressed: true })).toHaveCount(0)
	await expect(levelPoint(page, 7)).toHaveCount(0)
	await level6.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=EQWEEW\b/)
	await expect(
		level6.getByRole("button", { name: /^W /, pressed: true }),
	).toBeVisible()

	await levelPoint(page, 2).getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=EWWEEW\b/)

	await page.reload()
	await expect(
		levelPoint(page, 6).getByRole("button", { name: /^W /, pressed: true }),
	).toBeVisible()
	await expect(
		page.getByRole("table", { name: "Noxious Trap per rank" }),
	).toBeVisible()
})

test.describe("on a phone", () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

	test("the Skills tab lists a row per level", async ({ page }) => {
		await page.goto("/champions/Teemo?lvl=4")
		await page.getByRole("tab", { name: "Skills" }).click()

		await expect(levelPoint(page, 2)).toHaveCount(0)
		await levelPoint(page, 1).getByRole("button", { name: /^Q / }).click()
		await levelPoint(page, 2).getByRole("button", { name: /^W / }).click()
		await expect(page).toHaveURL(/[?&]skills=QW\b/)
		await expect(levelPoint(page, 5)).toHaveCount(0)
	})
})
