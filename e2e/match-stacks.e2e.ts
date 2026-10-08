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

test("Mejai's Glory stops at its cap, gives its move speed from 10 and leaves with the item", async ({
	page,
}) => {
	await page.goto("/champions/Heimerdinger?items=3041")
	const glory = stacks(page, "Mejai's Glory")
	await expect(glory).toHaveValue("0")
	const speed = await statTotal(page, "Movement Speed")
	const ap = await statTotal(page, "Ability Power")

	await glory.fill("9")
	await glory.press("Enter")
	await expect(page).toHaveURL(/[?&]stacks=mejai-stacks-9(?:&|$)/)
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(ap + 45)
	expect(await statTotal(page, "Movement Speed")).toBe(speed)

	await stacksSlider(page, "Mejai's Glory").press("ArrowRight")
	await expect(page).toHaveURL(/[?&]stacks=mejai-stacks-10(?:&|$)/)
	await expect
		.poll(() => statTotal(page, "Movement Speed"))
		.toBeGreaterThan(speed)

	await glory.fill("40")
	await glory.press("Tab")
	await expect(glory).toHaveValue("25")
	await expect(page).toHaveURL(/[?&]stacks=mejai-stacks-25(?:&|$)/)
	await expect.poll(() => statTotal(page, "Ability Power")).toBe(ap + 125)

	await page.getByRole("button", { name: "Remove Mejai's Soulstealer" }).click()
	await expect(glory).toHaveCount(0)
})

test("Kindred's marks give attack range only from 4 on, in steps, and keep through a reload", async ({
	page,
}) => {
	// With Q learned, Dance of Arrows reads the marks too: its row shares the passive's one input.
	await page.goto("/champions/Kindred?lvl=3&skills=QWE")
	const marks = stacks(page, "Marks of the Kindred")
	await expect(marks).toHaveValue("0")
	const range = await statTotal(page, "Attack Range")

	await marks.fill("3")
	await marks.press("Enter")
	await expect(page).toHaveURL(/[?&]stacks=kindred-marks-3(?:&|$)/)
	expect(await statTotal(page, "Attack Range")).toBe(range)

	await stacksSlider(page, "Marks of the Kindred").press("ArrowRight")
	await expect(page).toHaveURL(/[?&]stacks=kindred-marks-4(?:&|$)/)
	await expect.poll(() => statTotal(page, "Attack Range")).toBe(range + 75)

	await stacksSlider(page, "Marks of the Kindred").press("End")
	await expect(page).toHaveURL(/[?&]stacks=kindred-marks-30(?:&|$)/)
	await expect.poll(() => statTotal(page, "Attack Range")).toBe(range + 250)

	await page.reload()
	await expect(marks).toHaveValue("30")
	await expect.poll(() => statTotal(page, "Attack Range")).toBe(range + 250)
})
