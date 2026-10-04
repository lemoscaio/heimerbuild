import type { ChampionForm } from "@schemas/champion"
import { useId, useState } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
	createTooltipHandle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import type { FormLocks } from "../lib/form-locks"

type FormToggleProps = {
	forms: readonly ChampionForm[]
	/** The selected form's id. */
	form: string
	onFormChange: (formId: string) => void
	/** The forms that cannot be picked yet, with why ("Learn R to unlock Dragon"). */
	locks?: FormLocks
	/** Read by screen readers after a switch. */
	announcement: string
} & Omit<React.ComponentProps<"div">, "children">

const NO_LOCKS: FormLocks = {}

/**
 * Segmented switch between a champion's forms ("Mini Gnar | Mega Gnar"). A form that needs an
 * ability point stays visible but disabled, with the reason under the switch; a form with a game
 * name of its own shows it in a tooltip ("Pow-Pow").
 */
export function FormToggle({
	forms,
	form,
	onFormChange,
	locks = NO_LOCKS,
	announcement,
	className,
	...props
}: FormToggleProps) {
	const labelId = useId()
	const reasonId = useId()
	const [tooltip] = useState(createTooltipHandle<string>)
	const reasons = forms.flatMap(({ id }) => locks[id] ?? [])

	return (
		<div className={cn("flex flex-col gap-1.5", className)} {...props}>
			<span id={labelId} className="text-subtle text-xs max-lg:sr-only">
				Form
			</span>
			<ToggleGroup
				aria-labelledby={labelId}
				className="gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.75"
				value={[form]}
				// Pressing the selected form again would leave none: one form is always selected.
				onValueChange={([next]) => next && onFormChange(next)}
			>
				{forms.map(({ id, name, gameName }) => (
					<TooltipTrigger
						key={id}
						handle={tooltip}
						payload={gameName}
						disabled={!gameName}
						render={
							<ToggleGroupItem
								value={id}
								disabled={!!locks[id]}
								aria-description={gameName}
								aria-describedby={locks[id] ? reasonId : undefined}
								className="h-auto min-h-9 flex-1 rounded-md px-3.5 font-semibold text-prose data-pressed:inset-ring-0 data-pressed:bg-lilac data-pressed:text-surface-sunken data-disabled:opacity-50 max-lg:min-h-11"
							/>
						}
					>
						{name}
					</TooltipTrigger>
				))}
				<Tooltip handle={tooltip}>
					{({ payload }) => <TooltipContent>{payload}</TooltipContent>}
				</Tooltip>
			</ToggleGroup>
			{!!reasons.length && (
				<p id={reasonId} className="text-subtle text-xs">
					{reasons.join(" · ")}
				</p>
			)}
			<PoliteStatus message={announcement} />
		</div>
	)
}
