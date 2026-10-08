import { expect, type Page } from "@playwright/test"
import {
	chosenItems,
	itemNames,
	levelSlider,
	statsPanel,
	test,
} from "./fixtures"

// A real link from before link versions: level, items, rune page on the Runes tab, skill points.
const LINK_WITHOUT_VERSION =
	"/champions/Heimerdinger?lvl=6&items=3089%2C3020&tab=runes&runes=8200-8229-0-0-0_8300-8304-8347_5008-0-0&skills=EQWQ"

function keystone(page: Page) {
	return page
		.getByRole("radiogroup", { name: "Sorcery keystone", exact: true })
		.getByRole("radio", { name: "Arcane Comet", exact: true })
}

test("a link without a version opens the same build as its v=1 link, and an edit writes the current version (v=2)", async ({
	page,
	context,
}) => {
	await page.goto(LINK_WITHOUT_VERSION)
	await expect(levelSlider(page)).toHaveValue("6")
	await expect(chosenItems(page)).toHaveCount(2)
	await expect(keystone(page)).toBeChecked()
	const stats = await statsPanel(page).textContent()
	const items = await itemNames(chosenItems(page))

	const versioned = await context.newPage()
	await versioned.goto(`${LINK_WITHOUT_VERSION}&v=1`)
	await expect(levelSlider(versioned)).toHaveValue("6")
	await expect(chosenItems(versioned)).toHaveCount(2)
	expect(await itemNames(chosenItems(versioned))).toEqual(items)
	await expect(keystone(versioned)).toBeChecked()
	await expect(statsPanel(versioned)).toHaveText(stats ?? "")

	await levelSlider(page).fill("7")
	await expect(page).toHaveURL(/[?&]v=2\b/)
	await expect(page).toHaveURL(/[?&]lvl=7\b/)
})
