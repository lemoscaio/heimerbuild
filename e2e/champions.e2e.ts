import { expect, type Page } from "@playwright/test"
import { levelSlider, settledText, statsPanel, test } from "./fixtures"

function championLinks(page: Page) {
	return page.getByRole("region", { name: "Champions" }).getByRole("link")
}

async function openChampionList(page: Page) {
	await page.getByRole("button", { name: /^Browse all/ }).click()
}

test("the champion list opens with the toggle or by typing a search, and the state is remembered", async ({
	page,
}) => {
	await page.goto("/")
	const toggle = page.getByRole("button", {
		name: /^Browse all|^Hide champions/,
	})
	await expect(toggle).toHaveAttribute("aria-expanded", "false")
	await expect(page.getByRole("region", { name: "Champions" })).toBeHidden()

	await toggle.click()
	await expect(toggle).toHaveAttribute("aria-expanded", "true")
	await expect(championLinks(page).first()).toBeVisible()
	await page.reload()
	await expect(toggle).toHaveAttribute("aria-expanded", "true")

	await toggle.click()
	await expect(championLinks(page)).toHaveCount(0)
	await page.getByRole("searchbox", { name: "Search a champion" }).fill("ahri")
	await expect(toggle).toHaveAttribute("aria-expanded", "true")
	await expect(championLinks(page)).toHaveCount(1)
})

test("search filters the champion grid", async ({ page }) => {
	await page.goto("/")
	await openChampionList(page)
	const search = page.getByRole("searchbox", { name: "Search a champion" })
	const champions = championLinks(page)
	await expect(champions.first()).toBeVisible()
	const total = await champions.count()
	expect(total).toBeGreaterThan(1)

	await search.fill("heimer")
	await expect(champions).toHaveCount(1)
	await expect(champions).toHaveAccessibleName("Heimerdinger")

	await search.fill("")
	await expect(champions).toHaveCount(total)
})

test("role chips combine with the search", async ({ page }) => {
	await page.goto("/")
	await openChampionList(page)
	const champions = championLinks(page)
	await expect(champions.first()).toBeVisible()
	const total = await champions.count()
	const roles = page.getByRole("group", { name: "Filter by role" })

	await roles.getByRole("button", { name: "Mage" }).click()
	await expect(champions).not.toHaveCount(total)
	const mages = await champions.count()
	expect(mages).toBeGreaterThan(1)

	await page.getByRole("searchbox", { name: "Search a champion" }).fill("he")
	await expect(champions).toHaveCount(1)
	await expect(champions).toHaveAccessibleName("Heimerdinger")

	await roles.getByRole("button", { name: "All" }).click()
	await expect(champions.nth(1)).toBeVisible()
	await page.getByRole("searchbox", { name: "Search a champion" }).fill("")
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
	const levelOneStats = await settledText(stats)

	await levelSlider(page).fill("18")

	await expect(levelSlider(page)).toHaveValue("18")
	await expect(stats).not.toHaveText(levelOneStats ?? "")
})

test("a build shows in recent builds only after an edit, filtered by the home search and roles", async ({
	page,
}) => {
	const recent = page.getByRole("region", { name: "Your recent builds" })
	const recentLinks = recent.getByRole("link")

	await page.goto("/champions/Heimerdinger")
	await expect(levelSlider(page)).toBeVisible()
	await page.goto("/")
	// No edit yet: the panel is not there at all.
	await expect(
		page.getByRole("searchbox", { name: "Search a champion" }),
	).toBeVisible()
	await expect(recent).toHaveCount(0)

	await page.goto("/champions/Heimerdinger")
	await levelSlider(page).fill("5")
	await expect(page).toHaveURL(/lvl=5/)
	await page.goto("/")
	await expect(recentLinks).toHaveCount(1)
	await expect(recentLinks).toContainText("Heimerdinger")

	const search = page.getByRole("searchbox", { name: "Search a champion" })
	await search.fill("ahri")
	await expect(recentLinks).toHaveCount(0)
	await expect(recent).toContainText("No recent builds match")

	await search.fill("heim")
	await expect(recentLinks).toHaveCount(1)
	await page
		.getByRole("group", { name: "Filter by role" })
		.getByRole("button", { name: "Marksman" })
		.click()
	await expect(recentLinks).toHaveCount(0)

	await page
		.getByRole("group", { name: "Filter by role" })
		.getByRole("button", { name: "Mage" })
		.click()
	await recentLinks.click()
	await expect(page).toHaveURL(/\/champions\/Heimerdinger\?lvl=5/)
})
