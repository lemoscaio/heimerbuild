import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function effectSwitch(page: Page, name: RegExp) {
	return statsPanel(page)
		.getByRole("region", { name: "Effects" })
		.getByRole("switch", { name })
}

/** A stat's total, as the stats panel shows it: the first unsigned number (signed ones are deltas, as "+67 vs Mega Gnar"). */
async function statTotal(page: Page, label: string) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText(label, { exact: true }) })
	const text = (await row.textContent()) ?? ""
	return Number(/(?<![+\-−\d.])\d+(?:\.\d+)?/.exec(text)?.[0])
}

test("Udyr's Wilding Claw is off by default; on, it raises the attack speed and goes into the link", async ({
	page,
}) => {
	await page.goto("/champions/Udyr?skills=Q")
	const clawSwitch = effectSwitch(page, /^Wilding Claw \(Q\)/)
	await expect(clawSwitch).not.toBeChecked()
	const before = await statTotal(page, "Attack Speed")

	await clawSwitch.click()
	await expect(clawSwitch).toBeChecked()
	await expect(page).toHaveURL(/[?&]effects=udyr-q-active(?:&|$)/)
	await expect
		.poll(() => statTotal(page, "Attack Speed"))
		.toBeGreaterThan(before)

	await clawSwitch.click()
	await expect(page).not.toHaveURL(/[?&]effects=/)
	await expect.poll(() => statTotal(page, "Attack Speed")).toBe(before)
})

test("Mini Gnar's Hyper raises the movement speed, boosted by GNAR! once R has a point", async ({
	page,
}) => {
	await page.goto("/champions/Gnar?lvl=5&skills=QWEQQ")
	const hyper = effectSwitch(page, /^Hyper \(W\)/)
	await expect(hyper).not.toBeChecked()
	const before = await statTotal(page, "Movement Speed")

	await hyper.click()
	await expect(page).toHaveURL(/[?&]effects=gnar-w-hyper(?:&|$)/)
	await expect
		.poll(() => statTotal(page, "Movement Speed"))
		.toBeGreaterThan(before)
	const unboosted = await statTotal(page, "Movement Speed")
	await expect(hyper).not.toHaveAccessibleDescription(/boosted by/)

	// Level 6 with R: GNAR!'s passive raises the same row.
	await page.goto("/champions/Gnar?lvl=6&skills=QWEQQR&effects=gnar-w-hyper")
	await expect(hyper).toBeChecked()
	await expect(hyper).toHaveAccessibleDescription(/boosted by GNAR! \(R1\)$/)
	await expect(
		effectSwitch(page, /^GNAR! \(R\)/),
		"no separate GNAR! row",
	).toHaveCount(0)
	await expect
		.poll(() => statTotal(page, "Movement Speed"))
		.toBeGreaterThan(unboosted)

	// Hyper is Mini Gnar's: as Mega Gnar its row leaves the list.
	await page
		.getByRole("group", { name: "Form" })
		.getByRole("button", { name: "Mega Gnar" })
		.click()
	await expect(hyper).toHaveCount(0)
})

test("Master Yi's Highlander is off by default; on, it raises both speeds and goes into the link", async ({
	page,
}) => {
	await page.goto("/champions/MasterYi?lvl=6&skills=QEQWQR")
	const highlander = effectSwitch(page, /^Highlander \(R\)/)
	await expect(highlander).not.toBeChecked()
	const attackSpeed = await statTotal(page, "Attack Speed")
	const movementSpeed = await statTotal(page, "Movement Speed")

	await highlander.click()
	await expect(page).toHaveURL(/[?&]effects=master-yi-r-active(?:&|$)/)
	await expect
		.poll(() => statTotal(page, "Attack Speed"))
		.toBeGreaterThan(attackSpeed)
	await expect
		.poll(() => statTotal(page, "Movement Speed"))
		.toBeGreaterThan(movementSpeed)
})

test("Olaf's Tough It Out says how long each part lasts: its attack speed 5 s, its shield 2.5 s", async ({
	page,
}) => {
	await page.goto("/champions/Olaf?lvl=9&skills=WQEWWRWQW")
	const toughItOut = effectSwitch(page, /^Tough It Out \(W\)/)
	await expect(toughItOut).not.toBeChecked()
	await expect(toughItOut).toHaveAccessibleName(/After casting$/)
	await expect(toughItOut).toHaveAccessibleDescription(
		/Attack Speed for 5 s · \d+ shield for 2\.5 s$/,
	)
})
