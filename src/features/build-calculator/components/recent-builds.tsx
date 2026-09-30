import { Link } from "@tanstack/react-router"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { useChampions } from "@/data/hooks/use-champions"
import { useCurrentPatch } from "@/data/hooks/use-current-patch"
import { cn } from "@/lib/cn"
import { filterChampions } from "@/lib/filter-champions"
import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import { useRecentBuilds } from "../hooks/use-recent-builds"
import { toBuildSearch } from "../lib/build-search"
import type { RecentBuild } from "../services/recent-builds"

type RecentBuildLinkProps = {
	build: RecentBuild
	champion: { name: string; icon: string } | undefined
}

function RecentBuildLink({ build, champion }: RecentBuildLinkProps) {
	const name = champion?.name ?? build.championKey
	const itemCount = build.itemIds.length

	return (
		<Link
			to="/champions/$key"
			params={{ key: build.championKey }}
			search={toBuildSearch({
				level: build.level,
				itemIds: build.itemIds,
				patch: build.patch,
			})}
			className="flex items-center gap-2.5 rounded-xl border border-primary-2 bg-primary-0 px-3.5 py-2.5 transition-colors hover:bg-primary-2"
		>
			<GameIcon
				src={champion?.icon}
				name={name}
				width={36}
				height={36}
				loading="lazy"
				className="size-9 rounded-md ring-1 ring-gold"
			/>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate font-semibold text-sm text-white">
					{name}
				</span>
				<span className="text-subtle text-xs">
					Lv {build.level} · {itemCount} {itemCount === 1 ? "item" : "items"}
				</span>
			</span>
		</Link>
	)
}

type RecentBuildsProps = {
	/** The home page's search text: only builds of matching champions are listed. */
	search: string
	/** The home page's role chip; every role when `undefined`. */
	role: ChampionRole | undefined
} & React.ComponentProps<"section">

/** The builds last edited in this browser, each linking back to its build; nothing until there is one. */
export function RecentBuilds({
	search,
	role,
	className,
	...props
}: RecentBuildsProps) {
	const titleId = useId()
	const builds = useRecentBuilds()
	const patch = useCurrentPatch()
	const { data: champions } = useChampions(patch.data)
	const championsByKey = new Map(
		champions?.map((champion) => [champion.key, champion]),
	)
	const matchingKeys = new Set(
		filterChampions(champions ?? [], search, { role }).map(({ key }) => key),
	)
	// Until the champions load, every build is listed.
	const shownBuilds = champions
		? builds.filter(({ championKey }) => matchingKeys.has(championKey))
		: builds

	if (!builds.length) return null

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col items-center gap-2.5", className)}
			{...props}
		>
			<h2
				id={titleId}
				className="font-display font-semibold text-gold text-xs uppercase tracking-widest"
			>
				Your recent builds
			</h2>
			{!shownBuilds.length && (
				<p className="text-prose text-sm">No recent builds match</p>
			)}
			{!!shownBuilds.length && (
				<ul className="flex flex-wrap justify-center gap-3">
					{shownBuilds.map((build) => (
						<li key={build.championKey}>
							<RecentBuildLink
								build={build}
								champion={championsByKey.get(build.championKey)}
							/>
						</li>
					))}
				</ul>
			)}
			<p className="text-subtle text-xs">Kept in this browser, no login.</p>
		</section>
	)
}
