import { AppName } from "@/components/common/app-name"
import { MainPageLogo } from "@/components/common/main-page-logo"
import { ChampionBrowser } from "@/features/champions/components/champion-browser"

export function ChampionChoosePage() {
	return (
		<div className="page-container page-container--champions-page">
			<main className="champions-page">
				<AppName />
				<MainPageLogo />
				<ChampionBrowser />
			</main>
		</div>
	)
}
