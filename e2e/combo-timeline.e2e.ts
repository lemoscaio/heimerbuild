import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

const JAX =
	"/champions/Jax?lvl=9&skills=EQWWWRWQW&tab=combo&combo=e.q.w.aa.aa.aa"

function timeline(page: Page) {
	return page.getByRole("figure", { name: "Combo timeline, time flowing down" })
}

function view(page: Page, name: "List" | "Timeline") {
	return page.getByRole("group", { name: "View" }).getByRole("button", { name })
}

/** The list's steps, each with its remove button; none while the timeline shows. */
function removeButtons(page: Page) {
	return page.getByRole("button", { name: /^Remove step / })
}

/** Exactly one view of the steps on screen. */
async function expectTimelineOnly(page: Page) {
	await expect(timeline(page)).toHaveCount(1)
	await expect(removeButtons(page)).toHaveCount(0)
}

async function expectListOnly(page: Page) {
	await expect(timeline(page)).toHaveCount(0)
	// The tab groups the three attacks, so it lists fewer remove buttons than steps.
	await expect(removeButtons(page).first()).toBeVisible()
}

test("the timeline replaces the list in the tab and the expanded combo, and the choice is remembered", async ({
	page,
}) => {
	await page.goto(JAX)
	await expectListOnly(page)

	for (let round = 0; round < 3; round++) {
		await view(page, "Timeline").click()
		await expectTimelineOnly(page)
		await view(page, "List").click()
		await expectListOnly(page)
	}

	await view(page, "Timeline").click()
	// The text alternative: six steps and Counter Strike's strike at 1.00 s.
	await expect(timeline(page).getByRole("listitem")).toHaveCount(7)
	await expect(timeline(page)).toContainText("Counter Strike strikes at 1.00 s")

	for (const tab of ["Items", "Runes", "Skills", "Combo"]) {
		await page.getByRole("tab", { name: tab }).click()
		await expect(page.getByRole("tabpanel")).toHaveCount(1)
	}
	await expectTimelineOnly(page)

	for (let round = 0; round < 2; round++) {
		await page.getByRole("button", { name: "Expand combo" }).click()
		await expect(page.getByRole("tabpanel")).toHaveCount(0)
		await expectTimelineOnly(page)
		await page.getByRole("button", { name: "Collapse combo" }).click()
		await expect(page.getByRole("tabpanel")).toHaveCount(1)
		await expectTimelineOnly(page)
	}

	await page.getByRole("button", { name: "Add Attack" }).click()
	await expect(timeline(page).getByRole("listitem")).toHaveCount(8)
	await expect(removeButtons(page)).toHaveCount(0)

	await page.reload()
	await expect(timeline(page)).toHaveCount(1)
	await expect(timeline(page).getByRole("listitem")).toHaveCount(8)
})
