import { Skeleton } from "@/components/ui/skeleton"
import { LevelRowLayout } from "./level-row-layout"

export function LevelSelectorSkeleton() {
	return (
		<LevelRowLayout>
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-10" />
				<Skeleton className="h-9 w-12" />
			</div>
			<Skeleton className="my-2 h-2 w-full" />
		</LevelRowLayout>
	)
}
