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

test("Mini Gnar's Hyper raises the movement speed; GNAR!'s passive stands in for it with more", async ({
	page,
}) => {
	await page.goto("/champions/Gnar?lvl=6&skills=QWEQQR")
	const hyper = effectSwitch(page, /^Hyper \(W\)/)
	const gnarPassive = effectSwitch(page, /^GNAR! \(R\) Passive/)
	await expect(hyper).not.toBeChecked()
	const before = await statTotal(page, "Movement Speed")

	await hyper.click()
	await expect(page).toHaveURL(/[?&]effects=gnar-w-hyper(?:&|$)/)
	await expect
		.poll(() => statTotal(page, "Movement Speed"))
		.toBeGreaterThan(before)
	const withHyper = await statTotal(page, "Movement Speed")

	await gnarPassive.click()
	await expect(hyper).toBeDisabled()
	await expect(hyper).toHaveAccessibleDescription(/^Replaced by GNAR!/)
	await expect
		.poll(() => statTotal(page, "Movement Speed"))
		.toBeGreaterThan(withHyper)

	// Hyper is Mini Gnar's: as Mega Gnar its rows leave the list.
	await page
		.getByRole("group", { name: "Form" })
		.getByRole("button", { name: "Mega Gnar" })
		.click()
	await expect(hyper).toHaveCount(0)
})
