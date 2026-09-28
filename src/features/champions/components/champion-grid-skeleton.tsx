import { Skeleton } from "@/components/ui/skeleton"

const placeholders = Array.from({ length: 30 }, (_, index) => index)

export function ChampionGridSkeleton() {
	return (
		<div className="champions-list" role="status">
			<span className="sr-only">Loading champions</span>
			{placeholders.map((index) => (
				<div key={index} className="champion-card champion-card--skeleton">
					<Skeleton className="champion-card__image-skeleton" />
					<Skeleton className="champion-card__name-skeleton" />
				</div>
			))}
		</div>
	)
}
