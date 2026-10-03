import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function effects(page: Page) {
	return statsPanel(page).getByRole("region", { name: "Effects" })
}

/** A stat's total, as the stats panel shows it. */
async function statTotal(page: Page, label: string) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText(label, { exact: true }) })
	const text = (await row.textContent()) ?? ""
	return Number(/\d+(?:\.\d+)?/.exec(text)?.[0])
}

function currentHealth(page: Page) {
	return effects(page).getByRole("slider", { name: "Current health" })
}

test("Malphite's Thunderclap passive shows its armor on a row without a switch and adds it to the total", async ({
	page,
}) => {
	await page.goto("/champions/Malphite?skills=Q")
	await expect(statsPanel(page)).toBeVisible()
	const withoutW = await statTotal(page, "Armor")

	await page.goto("/champions/Malphite?skills=W")
	const passive = effects(page).getByRole("group", {
		name: /^Thunderclap \(W\) Passive/,
	})
	await expect(passive).toHaveAccessibleDescription(/^\+[\d.]+ Armor/)
	await expect(passive.getByRole("switch")).toHaveCount(0)

	const description = await passive.evaluate(
		(element) =>
			document.getElementById(element.getAttribute("aria-describedby") ?? "")
				?.textContent ?? "",
	)
	const bonus = Number(/[\d.]+/.exec(description)?.[0])
	expect(bonus).toBeGreaterThan(0)
	await expect
		.poll(() => statTotal(page, "Armor"))
		.toBeCloseTo(withoutW + bonus, 1)
})

test("Tryndamere's current health raises Bloodlust's attack damage, goes into the link and survives a reload", async ({
	page,
}) => {
	await page.goto("/champions/Tryndamere?skills=Q")
	await expect(currentHealth(page)).toHaveValue("100")
	const atFullHealth = await statTotal(page, "Attack Damage")

	await currentHealth(page).fill("10")
	await expect(page).toHaveURL(/[?&]hp=10(?:&|$)/)
	await expect
		.poll(() => statTotal(page, "Attack Damage"))
		.toBeGreaterThan(atFullHealth)
	const atLowHealth = await statTotal(page, "Attack Damage")

	await page.reload()
	await expect(currentHealth(page)).toHaveValue("10")
	await expect.poll(() => statTotal(page, "Attack Damage")).toBe(atLowHealth)

	await currentHealth(page).press("End")
	await expect(page).not.toHaveURL(/[?&]hp=/)
	await expect.poll(() => statTotal(page, "Attack Damage")).toBe(atFullHealth)
})
