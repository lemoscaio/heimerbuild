import type { Champion } from "@schemas/champion"
import { ChampionSwitchPopover } from "@/features/champions/components/champion-switch-popover"
import { ChampionSwitchSheet } from "@/features/champions/components/champion-switch-sheet"
import type { BuildPage } from "./hooks/use-build-page"

type ChampionSwitcherProps = {
	build: BuildPage
	champion: Champion
	patch: string
	/** `popover` on desktop, `sheet` (a bottom sheet) on phones. */
	layout: "popover" | "sheet"
}

/** The champion's portrait, which opens the picker that switches the build to another champion. */
export function ChampionSwitcher({
	build,
	champion,
	patch,
	layout,
}: ChampionSwitcherProps) {
	const Switch =
		layout === "popover" ? ChampionSwitchPopover : ChampionSwitchSheet

	return (
		<Switch
			champion={champion}
			caption={build.championState.form?.name}
			patch={patch}
			footer={<SwitchOutcome level={build.championState.level} />}
			onSwitch={build.championSwitch.switchTo}
		/>
	)
}

/** What any switch keeps and resets, said before picking. */
function SwitchOutcome({ level }: { level: number }) {
	return (
		<div className="border-line border-t pt-2 text-[11px] text-prose leading-normal">
			<p>
				<span className="font-semibold text-kept">Keeps</span> Items · Runes ·
				Summoner spells · Level {level} · Game time
			</p>
			<p>
				<span className="font-semibold text-reset">Resets</span> Form · Skill
				points · Effect switches · Combo
			</p>
		</div>
	)
}
