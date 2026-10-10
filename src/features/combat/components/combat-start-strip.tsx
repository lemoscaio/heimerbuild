import { Plus, X } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/cn"
import { type StartAddition, useStartStrip } from "../hooks/use-start-strip"
import type { CombatStartChip, CombatStartView } from "../lib/combat-start"
import { CombatStartStackChip } from "./combat-start-stack-chip"

type CombatStartStripProps = {
	view: CombatStartView
	onReadyChange: (id: string, ready: boolean) => void
	onStacksChange: (id: string, count: number | undefined) => void
	onRunningChange: (id: string, running: boolean) => void
} & React.ComponentProps<"section">

type StartChipProps = {
	chip: Extract<CombatStartChip, { kind: "ready" | "running" }>
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
				aria-label={
					chip.kind === "ready"
						? `Start on cooldown: ${chip.label}`
						: `Remove from the start: ${chip.label}`
				}
				onClick={onRemove}
				className="rounded-full max-lg:size-11"
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}

type AddMenuGroup = {
	label: string
	items: readonly { addition: StartAddition; label: string }[]
}

/** The "+" menu's groups that have something to add, in the strip's order. */
function addMenuGroups({ additions }: CombatStartView): AddMenuGroup[] {
	return [
		{
			label: "Ready at the start",
			items: additions.ready.map(({ id, label }) => ({
				addition: { kind: "ready" as const, id },
				label,
			})),
		},
		{
			label: "Stacks at the start",
			items: additions.stacks.map(({ id, name, max }) => ({
				addition: { kind: "stacks" as const, id, max },
				label: `${name} ${max}/${max}`,
			})),
		},
		{
			label: "Running at the start",
			items: additions.running.map(({ id, label }) => ({
				addition: { kind: "running" as const, id },
				label,
			})),
		},
	].filter(({ items }) => items.length)
}

type AddMenuProps = {
	groups: readonly AddMenuGroup[]
	onAdd: (addition: StartAddition) => void
}

/** "+": lists what the start can add back or add, by group. */
function AddMenu({ groups, onAdd }: AddMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="icon-xs"
						data-start-add=""
						aria-label="Add to the combo start"
						className="rounded-full border-lilac/60 border-dashed max-lg:size-11"
					/>
				}
			>
				<Plus aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{groups.map(({ label, items }, index) => (
					<DropdownMenuGroup key={label}>
						{index > 0 && <DropdownMenuSeparator />}
						<DropdownMenuLabel>{label}</DropdownMenuLabel>
						{items.map((item) => (
							<DropdownMenuItem
								key={item.addition.id}
								onClick={() => onAdd(item.addition)}
							>
								{item.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * "Combo start" (issue 317): one chip per cooldown of the build, ready by default (× starts it on
 * its cooldown), then the stacking effects and buffs the combo starts with, opt-in from "+".
 */
export function CombatStartStrip({
	view,
	onReadyChange,
	onStacksChange,
	onRunningChange,
	className,
	...props
}: CombatStartStripProps) {
	const titleId = useId()
	const { strip, hasAdditions, remove, add } = useStartStrip({
		view,
		onReadyChange,
		onStacksChange,
		onRunningChange,
	})
	if (!view.chips.length && !hasAdditions) return null

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
			{!!view.chips.length && (
				<ul className="flex flex-wrap items-center gap-1.5">
					{view.chips.map((chip) =>
						chip.kind === "stacks" ? (
							<CombatStartStackChip
								key={chip.id}
								chip={chip}
								onCountChange={(count) => onStacksChange(chip.id, count)}
								onRemove={() => remove(chip)}
							/>
						) : (
							<StartChip
								key={chip.id}
								chip={chip}
								onRemove={() => remove(chip)}
							/>
						),
					)}
				</ul>
			)}
			{hasAdditions && <AddMenu groups={addMenuGroups(view)} onAdd={add} />}
		</section>
	)
}
