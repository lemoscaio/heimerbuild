import { expect } from "@playwright/test"
import {
	chosenItems,
	currentItems,
	itemNames,
	shopItems,
	test,
} from "./fixtures"

test("the shop filters by a stat and sorts by it", async ({
	page,
	request,
}) => {
	const items = await currentItems(request)
	const abilityPowerOf = new Map(
		items.map((item) => [item.name, item.stats.abilityPower ?? 0]),
	)
	const withAbilityPower = items.filter(
		(item) => (item.stats.abilityPower ?? 0) !== 0,
	)
	const highestFirst = withAbilityPower
		.map((item) => item.stats.abilityPower ?? 0)
		.sort((a, b) => b - a)

	await page.goto("/champions/Heimerdinger")
	const shop = shopItems(page)
	await expect(shop).toHaveCount(items.length)

	const statFilter = page.getByRole("group", { name: "Filter by stat" })
	await statFilter.getByRole("button", { name: "Ability Power" }).click()
	await expect(
		statFilter.getByRole("button", { name: "Ability Power", pressed: true }),
	).toBeVisible()
	await expect(shop).toHaveCount(withAbilityPower.length)
	expect((await itemNames(shop)).sort()).toEqual(
		withAbilityPower.map((item) => item.name).sort(),
	)

	await page.getByRole("combobox", { name: "Sort by" }).click()
	await page.getByRole("option", { name: "Ability Power" }).click()
	await expect
		.poll(async () =>
			(await itemNames(shop)).map((name) => abilityPowerOf.get(name)),
		)
		.toEqual(highestFirst)

	const withAbilityPowerOrMagicResist = items.filter(
		(item) =>
			(item.stats.abilityPower ?? 0) !== 0 ||
			(item.stats.magicResist ?? 0) !== 0,
	)
	await statFilter.getByRole("button", { name: "Magic Resistance" }).click()
	await page
		.getByRole("group", { name: "Match selected stats" })
		.getByRole("button", { name: "OR" })
		.click()
	await expect(shop).toHaveCount(withAbilityPowerOrMagicResist.length)
})

test("the shop is one Tab stop: arrow keys move between items and Enter adds one", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger")
	const shop = shopItems(page)
	await expect(shop.first()).toBeVisible()
	const [, , third] = await itemNames(shop)

	await page.getByRole("combobox", { name: "Sort by" }).focus()
	await page.keyboard.press("Tab")
	await expect(shop.first()).toBeFocused()
	await page.keyboard.press("ArrowRight")
	await page.keyboard.press("ArrowRight")
	await expect(shop.nth(2)).toBeFocused()
	await page.keyboard.press("Enter")

	expect(await itemNames(chosenItems(page))).toEqual([`Remove ${third}`])
})
