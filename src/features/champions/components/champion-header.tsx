import type { Champion } from "@schemas/champion"
import { ChevronRight } from "lucide-react"
import { GameIcon } from "@/components/common/game-icon"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { roleLabels } from "@/lib/champion-roles"
import { attackTypeLabels } from "../lib/champion-labels"
import { ChampionHeaderLayout } from "./champion-header-layout"

type ChampionHeaderProps = {
	champion: Pick<Champion, "name" | "title" | "icon" | "roles" | "lore">
	/** Melee or ranged at the selected level and form (Kayle turns ranged at 6). */
	attackType: Champion["attackType"]
	/** The selected form's name, over the portrait, for a champion with forms. */
	formName?: string
}

export function ChampionHeader({
	champion,
	attackType,
	formName,
}: ChampionHeaderProps) {
	return (
		<>
			<ChampionHeaderLayout>
				<GameIcon
					src={champion.icon}
					name={champion.name}
					caption={formName}
					className="size-16 rounded-lg border-2 border-gold/70"
				/>
				<div className="flex flex-col gap-0.5 font-display">
					<h1 className="font-extrabold text-xl leading-tight">
						{champion.name}
					</h1>
					<p className="text-sm">{champion.title}</p>
					<p className="mt-0.5 font-sans text-lilac text-xs">
						<span>
							{champion.roles.map((role) => roleLabels[role]).join(", ")}
						</span>
						<span aria-hidden="true"> · </span>
						<span>{attackTypeLabels[attackType]}</span>
					</p>
				</div>
			</ChampionHeaderLayout>
			<Collapsible className="text-white text-xs">
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
