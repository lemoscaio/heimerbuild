import { expect } from "@playwright/test"
import { test } from "./fixtures"

test("switching tabs leaves only the open tab's panel on the page", async ({
	page,
}) => {
	await page.goto("/champions/Quinn?lvl=18&tab=runes")
	await expect(page.getByRole("tabpanel", { name: "Runes" })).toBeVisible()
	await page
		.getByRole("radiogroup", { name: "Primary tree", exact: true })
		.getByRole("radio", { name: "Precision", exact: true })
		.click()

	for (const tab of ["Skills", "Combo"]) {
		await page.getByRole("tab", { name: tab }).click()
		await expect(page.getByRole("tabpanel", { name: tab })).toBeVisible()
		await expect(page.getByRole("tabpanel")).toHaveCount(1)
	}
})
