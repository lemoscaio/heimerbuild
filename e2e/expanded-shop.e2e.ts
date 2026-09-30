import { expect } from "@playwright/test"
import { chosenItems, itemNames, test } from "./fixtures"

test("the expanded shop adds an item, survives a reload and hands the build back to the overview", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	await page.getByRole("button", { name: "Expand shop" }).click()
	await expect(page).toHaveURL(/view=shop/)
	await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible()

	const bar = page.getByRole("region", { name: "Build" })
	const levelOne = await bar.textContent()
	await bar.getByRole("button", { name: "Level up" }).click()
	await expect(bar).not.toHaveText(levelOne ?? "")

	// Search and the AND/OR switch live in the expanded toolbar and rail.
	await expect(
		page.getByRole("group", { name: "Match selected stats" }),
	).toBeVisible()
	await page.keyboard.press("/")
	await page.keyboard.type("void")
	await page.keyboard.press("Escape")
	const shop = page.getByRole("region", { name: "Item shop" })
	await expect(shop.getByRole("button")).toHaveCount(1)
	await shop.getByRole("button", { name: "Void Staff", exact: true }).click()
	await page.getByRole("button", { name: "Add to build" }).click()
	await expect(chosenItems(page)).toHaveCount(1)

	await page.reload()
	await expect(page.getByRole("button", { name: "Collapse shop" })).toHaveCount(
		1,
	)
	await expect(chosenItems(page)).toHaveCount(1)

	await page.getByRole("button", { name: "Collapse shop" }).click()
	await expect(page).not.toHaveURL(/view=/)
	await expect(page.getByRole("button", { name: "Expand shop" })).toBeVisible()
	expect(await itemNames(chosenItems(page))).toEqual(["Remove Void Staff"])
})
