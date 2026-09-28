import { Skeleton } from "@/components/ui/skeleton"

export function ChampionHeaderSkeleton() {
	return (
		<div className="champion-info__header">
			<Skeleton className="champion-info__header-image-skeleton" />
			<div className="champion-info__name-title">
				<Skeleton className="skeleton--heading" />
				<Skeleton className="skeleton--text" />
				<Skeleton className="skeleton--text-short" />
			</div>
		</div>
	)
}
