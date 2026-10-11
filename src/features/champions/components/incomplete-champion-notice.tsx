import { Info } from "lucide-react"
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { IncompleteChampion } from "../lib/incomplete-champions"

type IncompleteChampionNoticeProps = {
	championName: string
	missing: IncompleteChampion["missing"]
}

/** "Incomplete" under the champion's name; what isn't modeled opens on hover, tap or Enter. */
export function IncompleteChampionNotice({
	championName,
	missing,
}: IncompleteChampionNoticeProps) {
	return (
		<Popover>
			<PopoverTrigger
				openOnHover
				delay={0}
				aria-label={`Incomplete: what isn't modeled for ${championName}`}
				className="-mx-1 inline-flex w-max cursor-help items-center gap-1 rounded-sm px-1 font-sans text-warning text-xs outline-ring hover:bg-line focus-visible:outline-2 aria-expanded:bg-line"
			>
				<Info aria-hidden="true" className="size-3" />
				Incomplete
			</PopoverTrigger>
			<PopoverContent side="bottom" align="start">
				<PopoverTitle>{championName} is incomplete</PopoverTitle>
				<PopoverDescription>
					{missing} aren't modeled yet, so the numbers that depend on them are
					missing.
				</PopoverDescription>
			</PopoverContent>
		</Popover>
	)
}
