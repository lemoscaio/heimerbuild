import { cn } from "@/lib/cn"

/** The build heading and its slots, shared with the loading placeholder. */
export function ItemSlotsPanel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-2.5", className)} {...props} />
}

/** Six slots in one row, a 3×2 grid in the workbench column. */
export const slotGridClassName =
	"grid grid-cols-[repeat(6,minmax(0,3.5rem))] justify-center gap-1.5 lg:grid-cols-3 lg:gap-2"
