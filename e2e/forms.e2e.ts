import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function formButton(page: Page, name: string, pressed?: boolean) {
	return page
		.getByRole("group", { name: "Form" })
		.getByRole("button", { name, pressed })
}

test("switching form changes the stats and is kept in the share link", async ({
	page,
}) => {
	await page.goto("/champions/Gnar")
	const stats = statsPanel(page)
	await expect(formButton(page, "Mini Gnar", true)).toBeVisible()
	const mini = await stats.textContent()

	await formButton(page, "Mega Gnar").click()
	await expect(formButton(page, "Mega Gnar", true)).toBeVisible()
	await expect(page).toHaveURL(/[?&]form=mega\b/)
	await expect(stats).not.toHaveText(mini ?? "")

	await page.reload()
	await expect(formButton(page, "Mega Gnar", true)).toBeVisible()

	await formButton(page, "Mini Gnar").click()
	await expect(page).not.toHaveURL(/[?&]form=/)
	await expect(stats).toHaveText(mini ?? "")
})

test("a form the champion does not have falls back to the default form", async ({
	page,
}) => {
	await page.goto("/champions/Gnar?form=cougar")
	await expect(formButton(page, "Mini Gnar", true)).toBeVisible()

	await page.goto("/champions/Heimerdinger?form=mega")
	await expect(statsPanel(page)).toBeVisible()
	await expect(page.getByRole("group", { name: "Form" })).toHaveCount(0)
})

function effects(page: Page) {
	return statsPanel(page).getByRole("region", { name: "Effects" })
}

/** A stat's total in the stats panel, skipping the signed delta chips (+150, −150) beside it. */
async function statTotal(page: Page, label: string) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText(label, { exact: true }) })
	const text = (await row.textContent()) ?? ""
	return Number(/(?<![+\-−\d.])\d+(?:\.\d+)?/.exec(text)?.[0])
}

test("Shyvana's Dragon form is locked until R is learned, then adds its bonus health with a row in Effects", async ({
	page,
}) => {
	await page.goto("/champions/Shyvana?lvl=6&skills=QWEQW")
	await expect(formButton(page, "Dragon")).toBeDisabled()
	await expect(formButton(page, "Dragon")).toHaveAccessibleDescription(/R/)
	const human = await statTotal(page, "Health")

	await page
		.getByRole("region", { name: "Skills" })
		.getByRole("button", { name: /^Dragon's Descent / })
		.click()
	await expect(formButton(page, "Dragon")).toBeEnabled()
	await formButton(page, "Dragon").click()
	await expect(page).toHaveURL(/[?&]form=dragon\b/)

	const dragon = effects(page).getByRole("group", {
		name: /^Dragon's Descent \(R\) Dragon/,
	})
	await expect(dragon).toHaveAccessibleDescription(/^\+150 Health/)
	await expect.poll(() => statTotal(page, "Health")).toBeCloseTo(human + 150, 1)

	await formButton(page, "Human").click()
	await expect(dragon).toHaveCount(0)
})

test("Jinx's Rockets add range by Q rank, and Rev'd up only shows with the Minigun", async ({
	page,
}) => {
	await page.goto("/champions/Jinx?lvl=4&skills=QWEQ")
	const revdUp = effects(page).getByRole("switch", { name: /Rev'd up/ })
	await expect(revdUp).not.toBeChecked()
	const minigunRange = await statTotal(page, "Attack Range")

	await formButton(page, "Rockets").click()
	await expect(page).toHaveURL(/[?&]form=rockets\b/)
	await expect
		.poll(() => statTotal(page, "Attack Range"))
		.toBe(minigunRange + 125)
	await expect(revdUp).toHaveCount(0)
})

test("Bel'Veth's True Form adds range and survives a reload", async ({
	page,
}) => {
	await page.goto("/champions/Belveth?lvl=6&skills=QWEQWR")
	const base = await statTotal(page, "Attack Range")

	await formButton(page, "True Form").click()
	await expect.poll(() => statTotal(page, "Attack Range")).toBe(base + 25)

	await page.reload()
	await expect(formButton(page, "True Form", true)).toBeVisible()
	await expect.poll(() => statTotal(page, "Attack Range")).toBe(base + 25)
})

function skillsRow(page: Page) {
	return page.getByRole("region", { name: "Skills" })
}

test("Jayce's Cannon swaps his abilities in the skills row and the Skills tab, keeping their ranks", async ({
	page,
}) => {
	await page.goto("/champions/Jayce?lvl=3&skills=QWE")
	await expect(
		skillsRow(page).getByRole("button", {
			name: /^To the Skies! \(Q\), rank 1/,
		}),
	).toBeVisible()

	await formButton(page, "Cannon").click()
	await expect(
		skillsRow(page).getByRole("button", { name: /^Shock Blast \(Q\), rank 1/ }),
	).toBeVisible()
	await expect(page).toHaveURL(/[?&]skills=QWE\b/)

	await page.getByRole("tab", { name: "Skills" }).click()
	await expect(
		page.getByRole("table", { name: "Shock Blast per rank" }),
	).toBeVisible()
	await expect(
		page.getByRole("table", { name: "To the Skies! per rank" }),
	).toHaveCount(0)

	await formButton(page, "Hammer").click()
	await expect(
		page.getByRole("table", { name: "To the Skies! per rank" }),
	).toBeVisible()
})

test("Cougar Nidalee has Takedown, Pounce and Swipe and keeps Aspect of the Cougar", async ({
	page,
}) => {
	await page.goto("/champions/Nidalee?lvl=2&skills=QW&form=cougar")
	const row = skillsRow(page)
	await expect(
		row.getByRole("button", { name: /^Takedown \(Q\), rank 1/ }),
	).toBeVisible()
	await expect(
		row.getByRole("button", { name: /^Pounce \(W\), rank 1/ }),
	).toBeVisible()
	await expect(
		row.getByRole("button", { name: /^Aspect Of The Cougar \(R\)/ }),
	).toBeVisible()

	await formButton(page, "Human").click()
	await expect(
		row.getByRole("button", { name: /^Javelin Toss \(Q\), rank 1/ }),
	).toBeVisible()
})
