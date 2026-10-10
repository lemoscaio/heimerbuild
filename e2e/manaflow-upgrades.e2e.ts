import { expect, type Page } from "@playwright/test"
import {
	chosenItems,
	itemNames,
	levelSlider,
	settledText,
	statsPanel,
	test,
} from "./fixtures"

const MANAFLOW = "Manaflow bonus mana"

function effects(page: Page) {
	return statsPanel(page).getByRole("region", { name: "Effects" })
}

function manaflowSlider(page: Page) {
	return effects(page).getByRole("slider", { name: MANAFLOW, exact: true })
}

function shopItem(page: Page, name: string) {
	return page
		.getByRole("region", { name: "Item shop" })
		.getByRole("button", { name, exact: true })
}

/** The chosen items' names once `count` are shown. */
async function chosenNames(page: Page, count: number) {
	await expect(chosenItems(page)).toHaveCount(count)
	return itemNames(chosenItems(page))
}

/** A stat's total, as the stats panel shows it. */
async function statTotal(page: Page, label: string) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText(label, { exact: true }) })
	const text = ((await settledText(row)) ?? "").replace(/,/g, "")
	return Number(/\d+(?:\.\d+)?/.exec(text)?.[0])
}

test("Manamune is Muramana at 360 Manaflow and Manamune again at 359, the input keeping focus", async ({
	page,
}) => {
	await page.goto("/champions/Ezreal?items=3004&stacks=manaflow-mana-359")
	expect(await chosenNames(page, 1)).toEqual(["Remove Manamune"])
	await expect.poll(() => statTotal(page, "Mana")).toBe(375 + 500 + 359)

	const slider = manaflowSlider(page)
	await slider.focus()
	await slider.press("ArrowRight")
	await expect(page).toHaveURL(/[?&]stacks=manaflow-mana-360(?:&|$)/)
	expect(await chosenNames(page, 1)).toEqual(["Remove Muramana"])
	await expect.poll(() => statTotal(page, "Mana")).toBe(375 + 1000)
	await expect(manaflowSlider(page)).toBeFocused()

	await page.keyboard.press("ArrowLeft")
	await expect(page).toHaveURL(/[?&]stacks=manaflow-mana-359(?:&|$)/)
	expect(await chosenNames(page, 1)).toEqual(["Remove Manamune"])
	await expect(manaflowSlider(page)).toBeFocused()
})

test("picking Muramana in the shop adds Manamune at 360; removing it drops the count", async ({
	page,
}) => {
	await page.goto("/champions/Ezreal")
	await shopItem(page, "Muramana").click()
	await expect(page.getByRole("region", { name: "Muramana" })).toBeVisible()
	await page.getByRole("button", { name: "Add to build" }).click()

	await expect(page).toHaveURL(/[?&]items=3004(?:&|$)/)
	await expect(page).toHaveURL(/[?&]stacks=manaflow-mana-360(?:&|$)/)
	expect(await chosenNames(page, 1)).toEqual(["Remove Muramana"])

	await chosenItems(page).first().click()
	await expect(chosenItems(page)).toHaveCount(0)
	await levelSlider(page).press("ArrowRight")
	await expect(page).not.toHaveURL(/[?&](?:items|stacks)=/)
})

test("a link with Muramana's id opens as Manamune at 360 and saves the canonical form", async ({
	page,
}) => {
	await page.goto("/champions/Ezreal?items=3042")
	expect(await chosenNames(page, 1)).toEqual(["Remove Muramana"])

	await levelSlider(page).press("ArrowRight")
	await expect(page).toHaveURL(/[?&]items=3004(?:&|$)/)
	await expect(page).toHaveURL(/[?&]stacks=manaflow-mana-360(?:&|$)/)
	expect(await chosenNames(page, 1)).toEqual(["Remove Muramana"])
})
