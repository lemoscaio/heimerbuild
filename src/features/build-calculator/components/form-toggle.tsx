import type { ChampionForm } from "@schemas/champion"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"

type FormToggleProps = {
	forms: readonly ChampionForm[]
	/** The selected form's id. */
	form: string
	onFormChange: (formId: string) => void
	/** Read by screen readers after a switch. */
	announcement: string
} & Omit<React.ComponentProps<"div">, "children">

/** Segmented switch between a champion's forms ("Mini Gnar | Mega Gnar"). */
export function FormToggle({
	forms,
	form,
	onFormChange,
	announcement,
	className,
	...props
}: FormToggleProps) {
	const labelId = useId()

	return (
		<div className={cn("flex flex-col gap-1.5", className)} {...props}>
			<span id={labelId} className="text-subtle text-xs max-lg:sr-only">
				Form
			</span>
			<ToggleGroup
				aria-labelledby={labelId}
				className="gap-0.5 rounded-lg border border-primary-2 bg-primary-4 p-0.75"
				value={[form]}
				// Pressing the selected form again would leave none: one form is always selected.
				onValueChange={([next]) => next && onFormChange(next)}
			>
				{forms.map(({ id, name }) => (
					<ToggleGroupItem
						key={id}
						value={id}
						className="h-auto min-h-9 flex-1 rounded-md px-3.5 font-semibold text-prose data-pressed:inset-ring-0 data-pressed:bg-lilac data-pressed:text-primary-4 max-lg:min-h-11"
					>
						{name}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<PoliteStatus message={announcement} />
		</div>
	)
}
