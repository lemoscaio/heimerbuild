import { Skeleton } from "@/components/ui/skeleton"
import { ChampionHeaderLayout } from "./champion-header-layout"

export function ChampionHeaderSkeleton() {
	return (
		<ChampionHeaderLayout>
			<Skeleton className="size-18 shrink-0" />
			<div className="flex flex-col gap-2">
				<Skeleton className="h-7 w-50" />
				<Skeleton className="h-3.5 w-35" />
				<Skeleton className="h-3 w-22" />
			</div>
		</ChampionHeaderLayout>
	)
}
