import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function effects(page: Page) {
	return statsPanel(page).getByRole("region", { name: "Effects" })
}

function gameTime(page: Page) {
	return effects(page).getByRole("textbox", { name: "Game time in minutes" })
}

function runeChoice(page: Page, rowName: string, name: string) {
	return page
		.getByRole("radiogroup", { name: rowName, exact: true })
		.getByRole("radio", { name, exact: true })
}

/** A stat's total, as the stats panel shows it. */
async function statTotal(page: Page, label: string) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText(label, { exact: true }) })
	const text = (await row.textContent()) ?? ""
	return Number(/\d+(?:\.\d+)?/.exec(text)?.[0])
}

test("Gathering Storm grows with the game time, which goes into the link and survives a reload", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger?tab=runes")
	await runeChoice(page, "Primary tree", "Sorcery").click()
	await runeChoice(page, "Sorcery keystone", "Arcane Comet").click()
	await runeChoice(page, "Sorcery row 3", "Gathering Storm").click()
	await expect(gameTime(page)).toHaveValue("0")
	await expect(page).not.toHaveURL(/[?&]min=/)
	const atStart = await statTotal(page, "Ability Power")

	await effects(page).getByRole("button", { name: "30 minutes" }).click()
	await expect(page).toHaveURL(/[?&]min=30(?:&|$)/)
	await expect(gameTime(page)).toHaveValue("30")
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(atStart + 48)

	await page.reload()
	await expect(gameTime(page)).toHaveValue("30")
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(atStart + 48)

	await effects(page)
		.getByRole("button", { name: "Increase game time in minutes" })
		.click()
	await expect(page).toHaveURL(/[?&]min=31(?:&|$)/)
	await gameTime(page).fill("0")
	await gameTime(page).press("Enter")
	await expect(page).not.toHaveURL(/[?&]min=/)
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(atStart)
})

test("with more bonus AD than AP, Gathering Storm gives attack damage", async ({
	page,
}) => {
	// Heimerdinger's adaptive type is AP; a Long Sword tips it to AD, like the stat shards.
	const storm =
		"/champions/Heimerdinger?items=1036&runes=8200-8229-8226-8210-8236__"
	await page.goto(storm)
	await expect(gameTime(page)).toHaveValue("0")
	const atStart = await statTotal(page, "Attack Damage")
	const ap = await statTotal(page, "Ability Power")

	await page.goto(`${storm}&min=30`)
	await expect(gameTime(page)).toHaveValue("30")
	await expect
		.poll(() => statTotal(page, "Attack Damage"))
		.toBeCloseTo(atStart + 28.8, 0)
	expect(await statTotal(page, "Ability Power")).toBe(ap)
})
