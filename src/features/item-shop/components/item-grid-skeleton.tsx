import { Skeleton } from "@/components/ui/skeleton"

const placeholders = Array.from({ length: 51 }, (_, index) => index)

export function ItemGridSkeleton() {
	return placeholders.map((index) => (
		<Skeleton key={index} className="size-10 rounded-sm" />
	))
}
