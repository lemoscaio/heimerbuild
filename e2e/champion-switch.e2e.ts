import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

const RUNES = "8200-8229-8275-8210-8237_8300-8306-8347_0-0-0"
const QUINN_BUILD = `/champions/Quinn?lvl=9&items=3031,6672&runes=${RUNES}&summoners=4,14&skills=QWEQQRQ&combo=aa.q`

/** A `name=value` param of the URL; commas may be percent-encoded. */
function param(name: string, value: string) {
	return new RegExp(`[?&]${name}=${value.replaceAll(",", "(?:,|%2C)")}(?:&|$)`)
}

function avatar(page: Page) {
	return page.getByRole("button", { name: "Switch champion" })
}

function picker(page: Page) {
	return page.getByRole("dialog", { name: "Switch champion" })
}

function championName(page: Page, name: string) {
	return page.getByRole("heading", { level: 1, name })
}

test("the avatar switches the champion with the keyboard, keeping the items and runes, and Undo returns", async ({
	page,
}) => {
	await page.goto(QUINN_BUILD)

	// Esc closes the picker and gives the focus back to the avatar.
	await avatar(page).focus()
	await page.keyboard.press("Enter")
	const search = picker(page).getByRole("combobox", {
		name: "Search a champion",
	})
	await expect(search).toBeFocused()
	await page.keyboard.press("Escape")
	await expect(picker(page)).toBeHidden()
	await expect(avatar(page)).toBeFocused()

	// Typing filters while the field keeps the focus; the arrows move the active champion.
	await page.keyboard.press("Enter")
	await expect(search).toBeFocused()
	await page.keyboard.type("tw")
	const twistedFate = picker(page).getByRole("option", {
		name: "Twisted Fate",
	})
	const twitch = picker(page).getByRole("option", { name: "Twitch" })
	await expect(twistedFate).toHaveAttribute("aria-selected", "true")
	await page.keyboard.press("ArrowRight")
	await expect(twitch).toHaveAttribute("aria-selected", "true")
	await expect(search).toBeFocused()
	await page.keyboard.press("Enter")

	await expect(championName(page, "Twitch")).toBeVisible()
	await expect(page).toHaveURL(/\/champions\/Twitch\?/)
	await expect(page).toHaveURL(param("items", "3031,6672"))
	await expect(page).toHaveURL(param("runes", RUNES))
	await expect(page).toHaveURL(param("summoners", "4,14"))
	await expect(page).toHaveURL(param("lvl", "9"))
	expect(page.url()).not.toMatch(/[?&](skills|combo)=/)

	await expect(page.getByRole("button", { name: "Dismiss" })).toBeVisible()
	await page.getByRole("button", { name: "Undo" }).click()
	await expect(championName(page, "Quinn")).toBeVisible()
	await expect(page).toHaveURL(param("skills", "QWEQQRQ"))
	await expect(page).toHaveURL(param("combo", "aa.q"))
	await expect(page.getByRole("button", { name: "Undo" })).toBeHidden()
})

test("a switch is a history entry: Back returns to the previous champion, and Dismiss hides the notice", async ({
	page,
}) => {
	await page.goto(QUINN_BUILD)
	await avatar(page).click()
	await picker(page)
		.getByRole("combobox", { name: "Search a champion" })
		.fill("teemo")
	await picker(page).getByRole("option", { name: "Teemo" }).click()
	await expect(championName(page, "Teemo")).toBeVisible()

	await page.getByRole("button", { name: "Dismiss" }).click()
	await expect(page.getByRole("button", { name: "Undo" })).toBeHidden()

	await page.goBack()
	await expect(championName(page, "Quinn")).toBeVisible()
	await expect(page).toHaveURL(param("skills", "QWEQQRQ"))
})
