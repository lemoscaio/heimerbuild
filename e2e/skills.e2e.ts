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

test("a build starts with no skill points; the suggestion is never counted", async ({
	page,
}) => {
	await page.goto("/champions/Teemo")
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/point to spend/)
	await expect(orderLevel(page, 2)).toHaveCount(0)
	// Teemo's recommended order starts with E: it is suggested, still at rank 0.
	await expect(ability(page, "Toxic Shot")).toHaveAccessibleName(
		/rank 0 of 5, suggested/,
	)
	await expect(page).not.toHaveURL(/[?&]skills=/)

	// Any available ability can take the point instead of the suggested one.
	await ability(page, "Blinding Dart").click()
	await expect(page).toHaveURL(/[?&]skills=Q\b/)
	await expect(ability(page, "Blinding Dart")).toHaveAccessibleName(/rank 1 /)
	await expect(ability(page, "Toxic Shot")).toHaveAccessibleName(/rank 0 of 5$/)
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/Q, spent/)
	// Every point is spent: nothing more goes in.
	await expect(ability(page, "Toxic Shot")).toHaveAttribute(
		"aria-disabled",
		"true",
	)
})

test("spent points follow the game's rules, leaving the levels they skip unspent", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=3")
	await expect(ability(page, "Noxious Trap")).toHaveAttribute(
		"aria-disabled",
		"true",
	)

	await ability(page, "Blinding Dart").click()
	await expect(page).toHaveURL(/[?&]skills=Q\b/)
	// Rank 2 needs level 3: the point goes there, and level 2 stays unspent.
	await ability(page, "Blinding Dart").click()
	await expect(page).toHaveURL(/[?&]skills=Q_Q\b/)
	await expect(ability(page, "Blinding Dart")).toHaveAttribute(
		"aria-disabled",
		"true",
	)
	await ability(page, "Move Quick").click()
	await expect(page).toHaveURL(/[?&]skills=QWQ\b/)
})

test("at level 9, Q then Q lands on levels 1 and 3, and the gap survives a reload", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=9")
	await ability(page, "Blinding Dart").click()
	await ability(page, "Blinding Dart").click()
	await expect(page).toHaveURL(/[?&]skills=Q_Q\b/)

	await page.reload()
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/Q, spent/)
	await expect(orderLevel(page, 2)).toHaveAccessibleName(/point to spend/)
	await expect(orderLevel(page, 3)).toHaveAccessibleName(/Q, spent/)
	await expect(ability(page, "Blinding Dart")).toHaveAccessibleName(/rank 2 /)

	// An unspent level takes a point directly.
	await orderLevel(page, 5).click()
	await page.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=Q_Q_W\b/)
})

test("use recommended order fills the points left, and lowering the level keeps them for when it rises", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=6&skills=Q")
	await skills(page)
		.getByRole("button", { name: "Use recommended order" })
		.click()
	await expect(page).toHaveURL(/[?&]skills=Q\w{5}\b/)
	await expect(orderLevel(page, 6)).toHaveAccessibleName(/spent/)
	const filled = new URL(page.url()).searchParams.get("skills")

	const slider = levelSlider(page)
	await slider.focus()
	await slider.press("ArrowLeft")
	await slider.press("ArrowLeft")
	await expect(page).toHaveURL(
		new RegExp(`[?&]skills=${filled?.slice(0, 4)}\\b`),
	)
	await slider.press("ArrowRight")
	await slider.press("ArrowRight")
	await expect(page).toHaveURL(new RegExp(`[?&]skills=${filled}\\b`))

	// A different pick below the kept points drops them, like browser history.
	await slider.press("ArrowLeft")
	await slider.press("ArrowLeft")
	await orderLevel(page, 1).click()
	await page.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(
		new RegExp(`[?&]skills=W${filled?.slice(1, 4)}\\b`),
	)
	await slider.focus()
	await slider.press("ArrowRight")
	await slider.press("ArrowRight")
	await expect(page).toHaveURL(/[?&]lvl=6\b/)
	await expect(page).toHaveURL(
		new RegExp(`[?&]skills=W${filled?.slice(1, 4)}\\b`),
	)
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

test("a link's invalid points are left to spend, and reset clears every point", async ({
	page,
}) => {
	// Q cannot reach rank 2 at level 2: only the first point is kept.
	await page.goto("/champions/Teemo?lvl=6&skills=QQ")
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/spent/)
	await expect(orderLevel(page, 2)).toHaveAccessibleName(/point to spend/)

	await orderLevel(page, 2).click()
	await page.getByRole("button", { name: /^W / }).click()
	await expect(page).toHaveURL(/[?&]skills=QW\b/)

	await skills(page).getByRole("button", { name: "Reset" }).click()
	await expect(page).not.toHaveURL(/[?&]skills=/)
	await expect(orderLevel(page, 1)).toHaveAccessibleName(/point to spend/)
})
