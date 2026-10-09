import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

const JAX =
	"/champions/Jax?lvl=9&skills=EQWWWRWQW&tab=combo&combo=e.q.w.aa.aa.aa"

function combo(page: Page) {
	return page.getByRole("region", { name: "Combo" })
}

/** A figure of the combo's result by its name: "Damage", "Time". */
function comboTotal(page: Page, term: string) {
	return combo(page)
		.getByRole("group", { name: "Combo result" })
		.getByRole("group", { name: term, exact: true })
		.getByRole("definition")
}

/** The steps' remove buttons, in the order the steps show. */
function removeButtons(page: Page) {
	return page.getByRole("button", { name: /^Remove step / })
}

function stepNames(page: Page) {
	return removeButtons(page).evaluateAll((buttons) =>
		buttons.map((button) =>
			(button.getAttribute("aria-label") ?? "").replace("Remove step ", ""),
		),
	)
}

test("the expanded combo lists the steps by hit time, Counter Strike on its own row, with the tab's totals", async ({
	page,
}) => {
	await page.goto(JAX)
	const damage = await comboTotal(page, "Damage").textContent()
	const time = await comboTotal(page, "Time").textContent()

	await page.getByRole("button", { name: "Expand combo" }).click()
	await expect(page).toHaveURL(/[?&]view=combo\b/)
	await expect(
		page.getByRole("button", { name: "Collapse combo" }),
	).toBeFocused()
	await expect(page.getByRole("tabpanel")).toHaveCount(0)
	await expect(comboTotal(page, "Damage")).toHaveText(damage ?? "")
	await expect(comboTotal(page, "Time")).toHaveText(time ?? "")

	// Counter Strike starts first and lands 1 s later, after Leap Strike and Empower.
	expect(await stepNames(page)).toEqual([
		"2. Q · Leap Strike",
		"3. W · Empower",
		"1. E · Counter Strike",
		"4. Attack",
		"5. Attack",
		"6. Attack",
	])
	const counterStrike = page
		.getByRole("region", { name: "Steps" })
		.getByRole("listitem")
		.filter({
			has: page.getByRole("button", {
				name: "Remove step 1. E · Counter Strike",
			}),
		})
	await expect(counterStrike).toContainText("Lands 1.00 s")
	await expect(counterStrike).toContainText(/Starts\D*0\.00 s/)
	await expect(
		counterStrike.getByRole("list", { name: "Hits" }).getByRole("listitem"),
	).toHaveCount(1)

	await page
		.getByRole("group", { name: "Order by" })
		.getByRole("button", { name: "Step" })
		.click()
	expect(await stepNames(page)).toEqual([
		"1. E · Counter Strike",
		"2. Q · Leap Strike",
		"3. W · Empower",
		"4. Attack",
		"5. Attack",
		"6. Attack",
	])
})

test("edits in the expanded combo show in the Combo tab, and switching back and forth leaves one screen", async ({
	page,
}) => {
	await page.goto(JAX)
	await page.getByRole("button", { name: "Expand combo" }).click()

	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await expect(removeButtons(page)).toHaveCount(7)
	await page
		.getByRole("button", { name: "Move step 1, E · Counter Strike down" })
		.click()
	await expect(page).toHaveURL(/[?&]combo=q\.e\.w\.aa\.aa\.aa\.aa(&|$)/)
	await page.getByRole("button", { name: "Remove step 7. Attack" }).click()
	await expect(removeButtons(page)).toHaveCount(6)
	const damage = await comboTotal(page, "Damage").textContent()

	await page.getByRole("button", { name: "Collapse combo" }).click()
	await expect(page).not.toHaveURL(/view=/)
	await expect(page.getByRole("button", { name: "Expand combo" })).toBeFocused()
	await expect(page.getByRole("tabpanel", { name: "Combo" })).toBeVisible()
	await expect(comboTotal(page, "Damage")).toHaveText(damage ?? "")
	// The tab groups the three attacks into one block.
	await expect(removeButtons(page)).toHaveCount(3)

	for (let round = 0; round < 3; round++) {
		await page.getByRole("button", { name: "Expand combo" }).click()
		await expect(page.getByRole("region", { name: "Steps" })).toHaveCount(1)
		await expect(page.getByRole("tabpanel")).toHaveCount(0)
		await page.getByRole("button", { name: "Collapse combo" }).click()
		for (const tab of ["Items", "Skills", "Combo"]) {
			await page.getByRole("tab", { name: tab }).click()
			await expect(page.getByRole("tabpanel", { name: tab })).toBeVisible()
			await expect(page.getByRole("tabpanel")).toHaveCount(1)
		}
	}
	await expect(comboTotal(page, "Damage")).toHaveText(damage ?? "")
})

test("an ability's time in the area set in the expanded combo stays in the Combo tab", async ({
	page,
}) => {
	await page.goto(
		"/champions/Nasus?lvl=9&skills=QEWQQRQEQ&tab=combo&view=combo&combo=e",
	)
	const inFire = page.getByRole("textbox", {
		name: "Time in the fire in seconds",
	})
	const damage = await comboTotal(page, "Damage").textContent()

	await page
		.getByRole("button", { name: "Decrease Time in the fire in seconds" })
		.click()
	await expect(inFire).toHaveValue("4")
	await expect(comboTotal(page, "Damage")).not.toHaveText(damage ?? "")
	const shorter = await comboTotal(page, "Damage").textContent()

	await page.getByRole("button", { name: "Collapse combo" }).click()
	await expect(
		page.getByRole("textbox", { name: "Time in the fire in seconds" }),
	).toHaveValue("4")
	await expect(comboTotal(page, "Damage")).toHaveText(shorter ?? "")
})
