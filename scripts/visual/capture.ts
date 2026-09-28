// Visual regression helper for style migrations: captures the same screens of any deployment
// and reports the per-screen pixel difference between two captures.
//
//   bun scripts/visual/capture.ts capture --url <base-url> --out <dir>
//   bun scripts/visual/capture.ts compare --before <dir> --after <dir> [--diff <dir>]
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { parseArgs } from "node:util"
import {
	type Browser,
	chromium,
	type Locator,
	type Page,
} from "@playwright/test"

const viewports = [
	{ width: 390, height: 844 },
	{ width: 768, height: 1024 },
	{ width: 1280, height: 800 },
]

// Long Sword plus two Rabadon's Deathcaps: the game allows one, so the page shows a warning.
const IMPOSSIBLE_BUILD = "items=1036,3089,3089"
const CHAMPION = "/champions/Heimerdinger"

type Screen = {
	name: string
	setup: (page: Page) => Promise<void>
	fullPage: boolean
}

const screens: Screen[] = [
	{
		name: "home",
		fullPage: true,
		setup: async (page) => {
			await page.goto("/")
			await page.getByRole("main").getByRole("link").first().waitFor()
		},
	},
	{
		name: "home-search",
		fullPage: true,
		setup: async (page) => {
			await page.goto("/")
			await page
				.getByRole("searchbox", { name: "Search a champion" })
				.fill("heimer")
			await page.getByRole("link", { name: "Heimerdinger" }).waitFor()
		},
	},
	{
		name: "champion-level-1",
		fullPage: true,
		setup: async (page) => {
			await page.goto(`${CHAMPION}?${IMPOSSIBLE_BUILD}`)
			await page.getByRole("region", { name: "Champion stats" }).waitFor()
			await shopItem(page, "Long Sword").waitFor()
		},
	},
	{
		name: "champion-level-18",
		fullPage: true,
		setup: async (page) => {
			await page.goto(`${CHAMPION}?lvl=18&${IMPOSSIBLE_BUILD}`)
			await page.getByRole("region", { name: "Champion stats" }).waitFor()
			await shopItem(page, "Long Sword").waitFor()
		},
	},
	{
		name: "shop-filter-sort",
		fullPage: true,
		setup: async (page) => {
			await page.goto(CHAMPION)
			await shopItem(page, "Long Sword").waitFor()
			await page
				.getByRole("group", { name: "Filter by stat" })
				.getByRole("button", { name: "Ability Power" })
				.click()
			await chooseOption(page.getByLabel("Sort by"), "Ability Power")
		},
	},
	{
		name: "tooltip",
		fullPage: false,
		setup: async (page) => {
			await page.goto(CHAMPION)
			const item = shopItem(page, "Rabadon's Deathcap")
			await item.scrollIntoViewIfNeeded()
			await item.hover()
			await page.getByRole("tooltip").waitFor()
		},
	},
	{
		name: "lore-open",
		fullPage: false,
		setup: async (page) => {
			await page.goto(CHAMPION)
			await page.getByText("Lore", { exact: true }).click()
			// The lore is free text: give the disclosure time to expand.
			await page.waitForTimeout(500)
		},
	},
	{
		name: "home-loading",
		fullPage: false,
		setup: async (page) => {
			await page.route("**/data/**", () => {})
			await page.goto("/")
			await page.getByRole("status").first().waitFor()
		},
	},
	{
		name: "champion-loading",
		fullPage: false,
		setup: async (page) => {
			await page.route("**/data/**", () => {})
			await page.goto(CHAMPION)
			await page.getByRole("status").first().waitFor()
		},
	},
	{
		name: "shop-loading",
		fullPage: false,
		setup: async (page) => {
			await page.route("**/items.json*", () => {})
			await page.goto(CHAMPION)
			await page.getByRole("region", { name: "Champion stats" }).waitFor()
		},
	},
	{
		name: "home-error",
		fullPage: false,
		setup: async (page) => {
			await page.route("**/data/**", (route) => route.abort())
			await page.goto("/")
			await page.getByRole("alert").waitFor({ timeout: 30_000 })
		},
	},
]

function shopItem(page: Page, name: string) {
	return page
		.getByRole("region", { name: "Item shop" })
		.getByRole("button", { name, exact: true })
}

/** Works for a native `<select>` and for a custom combobox with a listbox. */
async function chooseOption(select: Locator, label: string) {
	const tagName = await select.evaluate((element) => element.tagName)
	if (tagName === "SELECT") {
		await select.selectOption({ label })
		return
	}
	await select.click()
	await select.page().getByRole("option", { name: label, exact: true }).click()
	// The pointer would rest on an item under the closed list and open its tooltip.
	await select.page().mouse.move(0, 0)
}

/** Lazy images never load outside the viewport, so a full-page shot would miss them. */
async function loadImages(page: Page) {
	await page.evaluate(async () => {
		const images = Array.from(document.images)
		for (const image of images) image.loading = "eager"
		const pending = images
			.filter((image) => !image.complete)
			.map(
				(image) =>
					new Promise((resolve) => {
						image.addEventListener("load", resolve, { once: true })
						image.addEventListener("error", resolve, { once: true })
					}),
			)
		await Promise.race([
			Promise.all(pending),
			new Promise((resolve) => setTimeout(resolve, 10_000)),
		])
		await document.fonts.ready
	})
}

async function capture(baseURL: string, outDir: string) {
	await mkdir(outDir, { recursive: true })
	const browser = await chromium.launch()
	const failures: string[] = []
	try {
		for (const viewport of viewports) {
			for (const screen of screens) {
				const file = `${screen.name}-${viewport.width}.png`
				try {
					await captureScreen(browser, { baseURL, viewport, screen, outDir })
					console.info(`captured ${file}`)
				} catch (error) {
					failures.push(file)
					console.error(`failed ${file}: ${(error as Error).message}`)
				}
			}
		}
	} finally {
		await browser.close()
	}
	if (failures.length) process.exitCode = 1
}

async function captureScreen(
	browser: Browser,
	{
		baseURL,
		viewport,
		screen,
		outDir,
	}: {
		baseURL: string
		viewport: { width: number; height: number }
		screen: Screen
		outDir: string
	},
) {
	const context = await browser.newContext({
		baseURL,
		viewport,
		reducedMotion: "reduce",
	})
	const page = await context.newPage()
	page.setDefaultTimeout(20_000)
	try {
		await screen.setup(page)
		await loadImages(page)
		await page.screenshot({
			path: join(outDir, `${screen.name}-${viewport.width}.png`),
			fullPage: screen.fullPage,
			animations: "disabled",
			caret: "hide",
			// The home logo is an animated WebP: any frame would read as a difference.
			mask: [page.getByRole("img", { name: "Heimerdinger", exact: true })],
		})
	} finally {
		await context.close()
	}
}

async function compare(beforeDir: string, afterDir: string, diffDir?: string) {
	const before = (await readdir(beforeDir)).filter((f) => f.endsWith(".png"))
	const after = new Set(
		(await readdir(afterDir)).filter((f) => f.endsWith(".png")),
	)
	if (diffDir) await mkdir(diffDir, { recursive: true })
	const browser = await chromium.launch()
	const page = await browser.newPage()
	const rows: string[] = ["| Screen | Size before | Size after | Diff % |"]
	rows.push("| --- | --- | --- | --- |")
	try {
		for (const file of before.sort()) {
			if (!after.has(file)) {
				rows.push(`| ${file} | | missing | |`)
				continue
			}
			const [a, b] = await Promise.all([
				readFile(join(beforeDir, file)),
				readFile(join(afterDir, file)),
			])
			const result = await page.evaluate(diffImages, {
				before: a.toString("base64"),
				after: b.toString("base64"),
			})
			if (diffDir) {
				const png = result.diffDataUrl.replace(/^data:image\/png;base64,/, "")
				await writeFile(join(diffDir, file), Uint8Array.fromBase64(png))
			}
			rows.push(
				`| ${file.replace(/\.png$/, "")} | ${result.beforeSize} | ${result.afterSize} | ${result.percent.toFixed(2)} |`,
			)
		}
	} finally {
		await browser.close()
	}
	console.info(rows.join("\n"))
}

/** Runs in the browser: pixels differ when any channel moves by more than a small tolerance. */
async function diffImages({
	before,
	after,
}: {
	before: string
	after: string
}) {
	async function load(base64: string) {
		const image = new Image()
		image.src = `data:image/png;base64,${base64}`
		await image.decode()
		return image
	}
	const [a, b] = await Promise.all([load(before), load(after)])
	const width = Math.max(a.width, b.width)
	const height = Math.max(a.height, b.height)
	function pixels(image: HTMLImageElement) {
		const canvas = document.createElement("canvas")
		canvas.width = width
		canvas.height = height
		const context = canvas.getContext("2d") as CanvasRenderingContext2D
		context.drawImage(image, 0, 0)
		return context.getImageData(0, 0, width, height).data
	}
	const pa = pixels(a)
	const pb = pixels(b)
	const canvas = document.createElement("canvas")
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext("2d") as CanvasRenderingContext2D
	const diff = context.createImageData(width, height)
	let changed = 0
	for (let i = 0; i < pa.length; i += 4) {
		const delta =
			Math.abs(pa[i] - pb[i]) +
			Math.abs(pa[i + 1] - pb[i + 1]) +
			Math.abs(pa[i + 2] - pb[i + 2]) +
			Math.abs(pa[i + 3] - pb[i + 3])
		const isChanged = delta > 24
		if (isChanged) changed++
		const gray = (pa[i] + pa[i + 1] + pa[i + 2]) / 12
		diff.data[i] = isChanged ? 255 : gray
		diff.data[i + 1] = isChanged ? 0 : gray
		diff.data[i + 2] = isChanged ? 60 : gray
		diff.data[i + 3] = 255
	}
	context.putImageData(diff, 0, 0)
	return {
		percent: (changed / (width * height)) * 100,
		beforeSize: `${a.width}x${a.height}`,
		afterSize: `${b.width}x${b.height}`,
		diffDataUrl: canvas.toDataURL("image/png"),
	}
}

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		url: { type: "string" },
		out: { type: "string" },
		before: { type: "string" },
		after: { type: "string" },
		diff: { type: "string" },
	},
})

if (positionals[0] === "capture" && values.url && values.out) {
	await capture(values.url, values.out)
} else if (positionals[0] === "compare" && values.before && values.after) {
	await compare(values.before, values.after, values.diff)
} else {
	console.error(
		"Usage:\n  bun scripts/visual/capture.ts capture --url <base-url> --out <dir>\n  bun scripts/visual/capture.ts compare --before <dir> --after <dir> [--diff <dir>]",
	)
	process.exitCode = 1
}
