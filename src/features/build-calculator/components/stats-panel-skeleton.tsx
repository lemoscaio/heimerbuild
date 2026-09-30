import { Skeleton } from "@/components/ui/skeleton"

const rows = Array.from({ length: 12 }, (_, index) => index)

export function StatsPanelSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<Skeleton className="h-6 w-16" />
			<div className="flex flex-col gap-0.5">
				{rows.map((row) => (
					<Skeleton key={row} className="h-6 w-full" />
				))}
			</div>
		</div>
	)
}
