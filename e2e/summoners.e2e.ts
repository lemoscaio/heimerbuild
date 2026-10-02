import { expect } from "@playwright/test"
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
