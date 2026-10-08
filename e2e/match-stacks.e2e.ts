import { expect, type Page } from "@playwright/test"
import { statsPanel, test } from "./fixtures"

function effects(page: Page) {
	return statsPanel(page).getByRole("region", { name: "Effects" })
}

function stacks(page: Page, name: string) {
	return effects(page).getByRole("textbox", { name, exact: true })
}

function stacksSlider(page: Page, name: string) {
	return effects(page).getByRole("slider", { name, exact: true })
}

/** A stat's total, as the stats panel shows it. */
async function statTotal(page: Page, label: string) {
	const row = statsPanel(page)
		.getByRole("listitem")
		.filter({ has: page.getByText(label, { exact: true }) })
	const text = (await row.textContent()) ?? ""
	return Number(/\d+(?:\.\d+)?/.exec(text)?.[0])
}

function combo(page: Page) {
	return page.getByRole("region", { name: "Combo" })
}

async function comboDamage(page: Page) {
	const text = await combo(page)
		.getByRole("group", { name: "Combo result" })
		.getByRole("group", { name: "Damage", exact: true })
		.getByRole("definition")
		.textContent()
	return Number(/\d+/.exec((text ?? "").replace(/,/g, ""))?.[0])
}

const NASUS_COMBO = "/champions/Nasus?lvl=9&skills=QWEQQRQEQ&tab=combo&combo=q"

test("Veigar's Phenomenal Evil stacks raise his AP, go into the link and survive a reload", async ({
	page,
}) => {
	await page.goto("/champions/Veigar")
	const evil = stacks(page, "Phenomenal Evil stacks")
	await expect(evil).toHaveValue("0")
	await expect(page).not.toHaveURL(/[?&]stacks=/)
	const atStart = await statTotal(page, "Ability Power")

	await evil.fill("150")
	await evil.press("Enter")
	await expect(page).toHaveURL(/[?&]stacks=phenomenal-evil-150(?:&|$)/)
	await expect(stacksSlider(page, "Phenomenal Evil stacks")).toHaveValue("150")
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(atStart + 150)

	await page.reload()
	await expect(evil).toHaveValue("150")
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(atStart + 150)

	await stacksSlider(page, "Phenomenal Evil stacks").press("Home")
	await expect(evil).toHaveValue("0")
	await expect(page).not.toHaveURL(/[?&]stacks=/)
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(atStart)
})

test("Nasus's Siphoning Strike stacks are the build's: the combo's Q reads them and offers no stacks choice", async ({
	page,
}) => {
	await page.goto(NASUS_COMBO)
	await expect(stacks(page, "Siphoning Strike stacks")).toHaveValue("0")
	await expect(
		combo(page).getByRole("group", { name: "Siphoning Strike stacks" }),
	).toHaveCount(0)
	const without = await comboDamage(page)

	const slider = stacksSlider(page, "Siphoning Strike stacks")
	await slider.press("ArrowRight")
	await slider.press("PageUp")
	await expect(page).toHaveURL(/[?&]stacks=siphoning-strike-11(?:&|$)/)
	await expect.poll(() => comboDamage(page)).toBeGreaterThan(without)

	// Past the slider's end, the box keeps the count and the slider sits at its end.
	const box = stacks(page, "Siphoning Strike stacks")
	await box.fill("2400")
	await box.press("Enter")
	await expect(page).toHaveURL(/[?&]stacks=siphoning-strike-2400(?:&|$)/)
	await expect(slider).toHaveValue("1500")
})

test("an old link with stacks on its Q step opens with them as the build's", async ({
	page,
}) => {
	await page.goto(NASUS_COMBO.replace("combo=q", "combo=q-100"))
	await expect(stacks(page, "Siphoning Strike stacks")).toHaveValue("100")

	await effects(page)
		.getByRole("button", { name: "Increase Siphoning Strike stacks" })
		.click()
	await expect(page).toHaveURL(/[?&]stacks=siphoning-strike-101(?:&|$)/)
	await expect(page).toHaveURL(/[?&]combo=q(?:&|$)/)
	await expect(page).toHaveURL(/[?&]v=2(?:&|$)/)
})
