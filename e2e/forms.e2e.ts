import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function formButton(page: Page, name: string, pressed?: boolean) {
	return page
		.getByRole("group", { name: "Form" })
		.getByRole("button", { name, pressed })
}

test("switching form changes the stats and is kept in the share link", async ({
	page,
}) => {
	await page.goto("/champions/Gnar")
	const stats = statsPanel(page)
	await expect(formButton(page, "Mini Gnar", true)).toBeVisible()
	const mini = await stats.textContent()

	await formButton(page, "Mega Gnar").click()
	await expect(formButton(page, "Mega Gnar", true)).toBeVisible()
	await expect(page).toHaveURL(/[?&]form=mega\b/)
	await expect(stats).not.toHaveText(mini ?? "")

	await page.reload()
	await expect(formButton(page, "Mega Gnar", true)).toBeVisible()

	await formButton(page, "Mini Gnar").click()
	await expect(page).not.toHaveURL(/[?&]form=/)
	await expect(stats).toHaveText(mini ?? "")
})

test("a form the champion does not have falls back to the default form", async ({
	page,
}) => {
	await page.goto("/champions/Gnar?form=cougar")
	await expect(formButton(page, "Mini Gnar", true)).toBeVisible()

	await page.goto("/champions/Heimerdinger?form=mega")
	await expect(statsPanel(page)).toBeVisible()
	await expect(page.getByRole("group", { name: "Form" })).toHaveCount(0)
})
