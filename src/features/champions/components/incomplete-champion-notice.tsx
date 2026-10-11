import { CircleAlert } from "lucide-react"
import { cn } from "@/lib/cn"
import type { IncompleteChampion } from "../lib/incomplete-champions"

type IncompleteChampionNoticeProps = {
	championName: string
	missing: IncompleteChampion["missing"]
} & React.ComponentProps<"p">

/** Near the champion card: what of the kit isn't modeled, so its numbers aren't read as final. */
export function IncompleteChampionNotice({
	championName,
	missing,
	className,
	...props
}: IncompleteChampionNoticeProps) {
	return (
		<p
			className={cn(
				"flex items-start gap-2 rounded-lg border border-line-strong p-3 text-prose text-xs leading-snug",
				className,
			)}
			{...props}
		>
			<CircleAlert
				aria-hidden="true"
				className="mt-0.5 size-3.5 shrink-0 text-warning"
			/>
			<span>
				<strong className="font-semibold text-white">
					{championName} is incomplete.
				</strong>{" "}
				{missing} aren't modeled yet, so the numbers that depend on them are
				missing.
			</span>
		</p>
	)
}
