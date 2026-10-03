import { expect, type Page } from "@playwright/test"
import { levelSlider, statsPanel, test } from "./fixtures"

// Teemo at level 5 with W at rank 2: Move Quick's passive is on by default.
const TEEMO = "/champions/Teemo?lvl=5&skills=QWEQW"
const PASSIVE_OFF = /[?&]effects=-teemo-w-passive(?:&|$)/

function effectSwitch(page: Page, name: RegExp) {
	return statsPanel(page)
		.getByRole("region", { name: "Effects" })
		.getByRole("switch", { name })
}

/** The Movement Speed row's total, as the stats panel shows it. */
async function movementSpeed(page: Page) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText("Movement Speed", { exact: true }) })
	const text = (await row.textContent()) ?? ""
	return Number(/\d+(?:\.\d+)?/.exec(text)?.[0])
}

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

test("turning Ghost on raises the movement speed and goes into the link; off takes both back", async ({
	page,
}) => {
	// Ghost and Flash, Move Quick's passive on by default.
	await page.goto(`${TEEMO}&summoners=6,4`)
	const ghost = effectSwitch(page, /^Ghost/)
	await expect(ghost).not.toBeChecked()
	const before = await movementSpeed(page)

	await ghost.click()
	await expect(ghost).toBeChecked()
	await expect(page).toHaveURL(/[?&]effects=ghost(?:&|$)/)
	await expect.poll(() => movementSpeed(page)).toBeGreaterThan(before)

	await page.reload()
	await expect(effectSwitch(page, /^Ghost/)).toBeChecked()

	await effectSwitch(page, /^Ghost/).press("Space")
	await expect(effectSwitch(page, /^Ghost/)).not.toBeChecked()
	await expect(page).not.toHaveURL(/[?&]effects=/)
	await expect.poll(() => movementSpeed(page)).toBe(before)
})

test("turning Move Quick's passive off lowers the movement speed", async ({
	page,
}) => {
	await page.goto(TEEMO)
	const passive = effectSwitch(page, /^Move Quick \(W\) Passive/)
	await expect(passive).toBeChecked()
	const before = await movementSpeed(page)

	await passive.click()
	await expect(page).toHaveURL(PASSIVE_OFF)
	await expect.poll(() => movementSpeed(page)).toBeLessThan(before)
})

test("Barrier and Heal show their shield and heal values", async ({ page }) => {
	await page.goto(`${TEEMO}&summoners=21,7`)

	await expect(effectSwitch(page, /^Barrier/)).toHaveAccessibleDescription(
		/^\d+ shield$/,
	)
	await expect(effectSwitch(page, /^Heal/)).toHaveAccessibleDescription(
		/^\d+ heal/,
	)
})

test("Move Quick's passive and active share a card; the active on dims the passive it replaces", async ({
	page,
}) => {
	await page.goto(TEEMO)
	const passive = effectSwitch(page, /^Move Quick \(W\) Passive/)
	const active = effectSwitch(page, /^Move Quick \(W\) Active/)
	await expect(passive).toBeEnabled()
	const before = await movementSpeed(page)

	await active.click()
	await expect(active).toBeChecked()
	await expect(passive).toBeChecked()
	await expect(passive).toBeDisabled()
	await expect(passive).toHaveAccessibleDescription(/^Replaced by the active/)
	await expect.poll(() => movementSpeed(page)).toBeGreaterThan(before)

	await active.click()
	await expect(passive).toBeEnabled()
	await expect.poll(() => movementSpeed(page)).toBe(before)
})
