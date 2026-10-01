import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function row(page: Page, name: string) {
	return page.getByRole("radiogroup", { name, exact: true })
}

function choice(page: Page, rowName: string, name: string) {
	return row(page, rowName).getByRole("radio", { name, exact: true })
}

test("a rune page changes the stats with its shards, and a copied link restores it", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"])
	await page.goto("/champions/Heimerdinger?lvl=11")
	await page.getByRole("tab", { name: "Runes" }).click()
	const stats = statsPanel(page)
	await expect(stats).toBeVisible()
	const withoutRunes = await stats.textContent()

	await choice(page, "Primary tree", "Sorcery").click()
	await choice(page, "Sorcery keystone", "Arcane Comet").click()
	await choice(page, "Secondary tree", "Inspiration").click()
	await choice(page, "Inspiration row 1", "Magical Footwear").click()
	await choice(page, "Inspiration row 3", "Cosmic Insight").click()
	// Runes with conditions are listed but leave the stats alone.
	await expect(stats).toHaveText(withoutRunes ?? "")

	await choice(page, "Offense shard", "Adaptive Force").click()
	await expect(stats).not.toHaveText(withoutRunes ?? "")
	// Each shard row is a radio group: arrow keys move the choice.
	await choice(page, "Defense shard", "Health").click()
	await page.keyboard.press("ArrowRight")
	await expect(
		choice(page, "Defense shard", "Tenacity and Slow Resist"),
	).toBeChecked()
	const withRunes = await stats.textContent()

	await page.getByRole("button", { name: "Copy link" }).click()
	await expect(page.getByRole("status").filter({ hasText: /\S/ })).toBeVisible()
	const link = await page.evaluate(() => navigator.clipboard.readText())

	const shared = await context.newPage()
	await shared.goto(link)
	// The link keeps the open tab: the shared page opens on Runes.
	await expect(shared.getByRole("tab", { name: "Runes" })).toHaveAttribute(
		"aria-selected",
		"true",
	)
	for (const [rowName, name] of [
		["Primary tree", "Sorcery"],
		["Sorcery keystone", "Arcane Comet"],
		["Secondary tree", "Inspiration"],
		["Inspiration row 1", "Magical Footwear"],
		["Inspiration row 3", "Cosmic Insight"],
		["Offense shard", "Adaptive Force"],
		["Defense shard", "Tenacity and Slow Resist"],
	] as const) {
		await expect(choice(shared, rowName, name)).toBeChecked()
	}
	await expect(statsPanel(shared)).toHaveText(withRunes ?? "")
})
