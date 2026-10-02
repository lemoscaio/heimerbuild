import { expect, type Page } from "@playwright/test"
import { levelSlider, test } from "./fixtures"

/** The `summoners` value in a URL or href; the comma may be percent-encoded. */
function summonersParam(first: string, second: string) {
	return new RegExp(`[?&]summoners=${first}(?:,|%2C)${second}(?:&|$)`)
}

test("a link's summoner spells stay through an edit and a reload, and reach the recent builds", async ({
	page,
}) => {
	// Ignite in D, Flash in F: the order is part of the build.
	await page.goto("/champions/Teemo?summoners=14,4")
	await levelSlider(page).fill("5")
	await expect(page).toHaveURL(/[?&]lvl=5\b/)
	await expect(page).toHaveURL(summonersParam("14", "4"))

	await page.reload()
	await expect(levelSlider(page)).toHaveValue("5")
	await expect(page).toHaveURL(summonersParam("14", "4"))

	await page.goto("/")
	const recentBuild = page
		.getByRole("region", { name: "Your recent builds" })
		.getByRole("link")
	await expect(recentBuild).toHaveAttribute("href", summonersParam("14", "4"))
	await recentBuild.click()
	await expect(page).toHaveURL(summonersParam("14", "4"))
})

function summonerSlot(page: Page, slot: 1 | 2) {
	return page
		.getByRole("group", { name: "Summoner spells" })
		.getByRole("button", { name: new RegExp(`^Summoner Spell ${slot}:`) })
}

function picker(page: Page, slot: 1 | 2) {
	return page.getByRole("dialog", { name: `Summoner Spell ${slot}` })
}

/** Each row's box from the rune page's top left, so scrolling the tab does not count as moving. */
async function rowBoxes(page: Page, rows: readonly string[]) {
	const origin = await page
		.getByRole("region", { name: "Rune page" })
		.evaluate((section) => {
			const { left, top } = section.getBoundingClientRect()
			return { left, top }
		})
	return Promise.all(
		rows.map((name) =>
			page
				.getByRole("radiogroup", { name, exact: true })
				.evaluate((row, { left, top }) => {
					const { x, y, width, height } = row.getBoundingClientRect()
					return { x: x - left, y: y - top, width, height }
				}, origin),
		),
	)
}

test("the slots pick with the mouse or the keyboard, swap by picking the other slot's spell, and clear", async ({
	page,
}) => {
	await page.goto("/champions/Teemo")

	await summonerSlot(page, 1).click()
	await picker(page, 1).getByRole("option", { name: "Flash" }).click()
	await expect(picker(page, 1)).toBeHidden()
	await expect(summonerSlot(page, 1)).toHaveAccessibleName(
		"Summoner Spell 1: Flash",
	)
	await expect(page).toHaveURL(summonersParam("4", ""))

	// Keyboard: focus starts on the first spell; two rows down is Ignite, Enter picks it.
	await summonerSlot(page, 2).click()
	await expect(
		picker(page, 2).getByRole("option", { name: "Barrier" }),
	).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await page.keyboard.press("ArrowDown")
	await expect(
		picker(page, 2).getByRole("option", { name: "Ignite" }),
	).toBeFocused()
	await page.keyboard.press("Enter")
	await expect(page).toHaveURL(summonersParam("4", "14"))

	// Flash is in the other slot: picking it there swaps the two.
	await summonerSlot(page, 2).click()
	await picker(page, 2).getByRole("option", { name: "Flash" }).click()
	await expect(page).toHaveURL(summonersParam("14", "4"))
	await expect(summonerSlot(page, 1)).toHaveAccessibleName(
		"Summoner Spell 1: Ignite",
	)

	await summonerSlot(page, 1).click()
	await page.keyboard.press("Escape")
	await expect(picker(page, 1)).toBeHidden()
	await expect(page).toHaveURL(summonersParam("14", "4"))

	await summonerSlot(page, 1).click()
	await picker(page, 1).getByRole("button", { name: "Clear" }).click()
	await expect(summonerSlot(page, 1)).toHaveAccessibleName(
		"Summoner Spell 1: empty",
	)
	await expect(page).toHaveURL(summonersParam("", "4"))
})

test("runes that react to the chosen spells get a hint without moving any rune row", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?tab=runes&summoners=4,14")
	await page
		.getByRole("radiogroup", { name: "Primary tree", exact: true })
		.getByRole("radio", { name: "Sorcery", exact: true })
		.click()
	const rows = [
		"Sorcery keystone",
		"Sorcery row 1",
		"Sorcery row 2",
		"Sorcery row 3",
	]
	const before = await rowBoxes(page, rows)

	const nimbusCloak = page
		.getByRole("radiogroup", { name: "Sorcery row 1", exact: true })
		.getByRole("radio", { name: "Nimbus Cloak", exact: true })
	await nimbusCloak.click()
	const interactions = page.getByRole("region", {
		name: "Summoner spell interactions",
	})
	await expect(
		interactions.getByRole("listitem").filter({ hasText: "Nimbus Cloak" }),
	).toBeVisible()
	expect(await rowBoxes(page, rows)).toEqual(before)

	// The hint is also the rune's tooltip, on the next hover.
	await interactions.hover()
	await nimbusCloak.hover()
	await expect(page.getByRole("tooltip")).toBeVisible()

	// A new spell changes the hint, never the rows.
	await summonerSlot(page, 1).click()
	await picker(page, 1).getByRole("option", { name: "Ghost" }).click()
	await expect(page).toHaveURL(summonersParam("6", "14"))
	expect(await rowBoxes(page, rows)).toEqual(before)
})

test.describe("on a phone", () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

	test("a slot's picker opens as a bottom sheet, and a tap picks the tapped spell", async ({
		page,
	}) => {
		// Reacting runes make each spell's description a different height: the grid must stay put.
		await page.goto(
			"/champions/Teemo?runes=8200-8229-8275-8210-8237_8300-8306-8347_0-0-0",
		)
		await summonerSlot(page, 1).tap()
		await picker(page, 1).getByRole("option", { name: "Flash" }).tap()
		await expect(picker(page, 1)).toBeHidden()
		await expect(page).toHaveURL(summonersParam("4", ""))

		await summonerSlot(page, 2).tap()
		await picker(page, 2).getByRole("option", { name: "Ghost" }).tap()
		await expect(page).toHaveURL(summonersParam("4", "6"))
	})
})
