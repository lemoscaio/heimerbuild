import { ChevronRight } from "lucide-react"
import { GameIcon } from "@/components/common/game-icon"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { Champion } from "../../../../scripts/sync-data/schemas/champion"
import { attackTypeLabels, roleLabels } from "../lib/champion-labels"
import { ChampionHeaderLayout } from "./champion-header-layout"

type ChampionHeaderProps = {
	champion: Pick<
		Champion,
		"name" | "title" | "icon" | "roles" | "attackType" | "lore"
	>
	/** Page actions shown at the end of the header, such as sharing the build. */
	children?: React.ReactNode
}

export function ChampionHeader({ champion, children }: ChampionHeaderProps) {
	return (
		<>
			<ChampionHeaderLayout>
				<GameIcon
					src={champion.icon}
					name={champion.name}
					className="size-18 rounded-md border border-primary-1"
				/>
				<div className="flex flex-col gap-0.5 font-display">
					<h3 className="font-extrabold text-2xl leading-tight">
						{champion.name}
					</h3>
					<h4 className="text-sm">{champion.title}</h4>
					<p className="mt-0.5 font-sans text-lilac text-xs">
						<span>
							{champion.roles.map((role) => roleLabels[role]).join(", ")}
						</span>
						<span aria-hidden="true"> · </span>
						<span>{attackTypeLabels[champion.attackType]}</span>
					</p>
				</div>
				{children && <div className="ml-auto self-start">{children}</div>}
			</ChampionHeaderLayout>
			<Collapsible className="bg-primary-3 px-4 pt-2.5 text-white text-xs">
				<CollapsibleTrigger className="group flex w-max items-center gap-1 text-lilac">
					<ChevronRight
						aria-hidden="true"
						className="size-3 transition-transform group-data-panel-open:rotate-90"
					/>
					Lore
				</CollapsibleTrigger>
				<CollapsibleContent className="mt-1.5 text-prose leading-normal">
					{champion.lore}
				</CollapsibleContent>
			</Collapsible>
		</>
	)
}
