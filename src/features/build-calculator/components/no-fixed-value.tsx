import { Info } from "lucide-react"
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"

type NoFixedValueProps = {
	/** The resource name, as the popover title. */
	label: string
	/** How the resource works; without one the dash stays plain text. */
	description?: string
}

/** "—" for a resource with no fixed size; its description opens on hover, tap or Enter. */
export function NoFixedValue({ label, description }: NoFixedValueProps) {
	if (!description) return <Dash />

	return (
		<Popover>
			<PopoverTrigger
				openOnHover
				delay={0}
				aria-label={`No fixed value, about ${label}`}
				className="-m-1 inline-flex cursor-help items-center gap-1 rounded-sm px-1 py-1 outline-ring hover:bg-primary-2 focus-visible:outline-2 aria-expanded:bg-primary-2"
			>
				<span aria-hidden="true">—</span>
				<Info aria-hidden="true" className="size-3.5 text-subtle" />
			</PopoverTrigger>
			<PopoverContent side="top">
				<PopoverTitle>{label}</PopoverTitle>
				<PopoverDescription>{description}</PopoverDescription>
			</PopoverContent>
		</Popover>
	)
}

function Dash() {
	return (
		<>
			<span aria-hidden="true">—</span>
			<span className="sr-only">no fixed value</span>
		</>
	)
}
