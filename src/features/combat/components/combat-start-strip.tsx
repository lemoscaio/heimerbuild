import { Plus, X } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/cn"
import { useStartStrip } from "../hooks/use-start-strip"
import type { CombatStartChip } from "../lib/combat-start"

type CombatStartStripProps = {
	chips: readonly CombatStartChip[]
	onReadyChange: (id: string, ready: boolean) => void
} & React.ComponentProps<"section">

type StartChipProps = {
	chip: CombatStartChip
	onRemove: () => void
}

function StartChip({ chip, onRemove }: StartChipProps) {
	return (
		<li className="flex items-center gap-0.5 rounded-full border border-lilac/60 bg-surface-raised py-0.5 pr-0.5 pl-2.5 text-xs">
			{chip.label}
			<Button
				variant="ghost"
				size="icon-xs"
				data-start-chip={chip.id}
				aria-label={`Start on cooldown: ${chip.label}`}
				onClick={onRemove}
				className="rounded-full max-lg:size-11"
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}

type AddBackMenuProps = {
	removed: readonly CombatStartChip[]
	onAdd: (id: string) => void
}

/** "+": lists the removed chips; picking one puts it back. */
function AddBackMenu({ removed, onAdd }: AddBackMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="icon-xs"
						data-start-add-back=""
						aria-label="Add back a cooldown ready at the start"
						className="rounded-full border-lilac/60 border-dashed max-lg:size-11"
					/>
				}
			>
				<Plus aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{removed.map(({ id, label }) => (
					<DropdownMenuItem key={id} onClick={() => onAdd(id)}>
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * "Combo start" (issue 317): one chip per cooldown of the build, ready by default; × starts that
 * effect on its cooldown, and "+" (only once one was removed) puts it back.
 */
export function CombatStartStrip({
	chips,
	onReadyChange,
	className,
	...props
}: CombatStartStripProps) {
	const titleId = useId()
	const { strip, ready, removed, remove, addBack } = useStartStrip({
		chips,
		onReadyChange,
	})
	if (!chips.length) return null

	return (
		<section
			ref={strip}
			aria-labelledby={titleId}
			className={cn("flex flex-wrap items-center gap-1.5", className)}
			{...props}
		>
			<h3 id={titleId} className="font-bold font-display text-sm">
				Combo start
			</h3>
			{!!ready.length && (
				<ul className="flex flex-wrap items-center gap-1.5">
					{ready.map((chip) => (
						<StartChip
							key={chip.id}
							chip={chip}
							onRemove={() => remove(chip.id)}
						/>
					))}
				</ul>
			)}
			{!!removed.length && <AddBackMenu removed={removed} onAdd={addBack} />}
		</section>
	)
}
