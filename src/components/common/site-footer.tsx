import { PRODUCT_NAME } from "@/lib/product-name"

/** Riot's required legal notice (Developer Policies) and the game data credit, on every page. */
export function SiteFooter() {
	return (
		<footer className="border-line border-t bg-surface-sunken px-4 pt-4 pb-[max(env(safe-area-inset-bottom),--spacing(4))] text-subtle text-xs leading-relaxed">
			<div className="mx-auto flex max-w-3xl flex-col gap-1 text-center">
				<p>
					{PRODUCT_NAME} isn't endorsed by Riot Games and doesn't reflect the
					views or opinions of Riot Games or anyone officially involved in
					producing or managing Riot Games properties. Riot Games, and all
					associated properties are trademarks or registered trademarks of Riot
					Games, Inc.
				</p>
				<p>Game data from Riot Games' Data Dragon and CommunityDragon.</p>
			</div>
		</footer>
	)
}
