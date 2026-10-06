import type { DamageType } from "@schemas/champion"
import { CircleAlert, GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import {
	DAMAGE_TYPE_NAMES,
	formatDamage,
	formatSeconds,
} from "../lib/combat-format"
import { FROM_MARKER, type HitView, type StepView } from "../lib/combat-view"

/** Damage colors, each with its type's name next to it: never color alone. */
const DAMAGE_COLORS = {
	physical: "text-physical",
	magic: "text-magic",
	true: "text-true-damage",
} as const satisfies Record<DamageType, string>

type CombatStepCardProps = {
	/** 1-based, among the actions (markers aren't counted). */
	number: number
	label: string
	icon: React.ReactNode
	/** When it ran; absent while the build loads, and in free mode. */
	time?: number
	/** Why it did not run; the totals leave it out. */
	refused?: string
	view?: StepView
	/** The reorder handle's events (`useStepReorder`). */
	handleProps: React.ComponentProps<"button">
	onRemove: () => void
	/** Extra parts of the step: a wait's length, its input, its outcomes. */
	children?: React.ReactNode
} & React.ComponentProps<"li">

/** One line per source: "Harrier · 45 physical (raw 76)", "Ignite ×5 · 250 true", or why it has no number. */
function HitLine({ hit }: { hit: HitView }) {
	if ("notModeled" in hit) {
		return (
			<li className="text-warning">
				{hit.name} · not modeled: {hit.notModeled.join("; ")}
			</li>
		)
	}
	return (
		<li>
			{hit.name}
			{hit.count > 1 && ` ×${hit.count}`} ·{" "}
			<span className={DAMAGE_COLORS[hit.type]}>
				{formatDamage(hit.final)} {DAMAGE_TYPE_NAMES[hit.type]}
			</span>{" "}
			<span className="text-subtle">(raw {formatDamage(hit.raw)})</span>
		</li>
	)
}

/** The target's health after the step, as a thin bar. */
function HealthBar({ share }: { share: number }) {
	const percent = Math.round(share * 100)
	return (
		<span
			role="img"
			aria-label={`Target health ${percent}%`}
			className="block h-1 overflow-hidden rounded-full bg-surface-raised"
		>
			<span
				className="block h-full bg-health"
				style={{ width: `${percent}%` }}
			/>
		</span>
	)
}

/** A step of the combo: time, action, marks, effects running, its damage and the target's health. */
export function CombatStepCard({
	number,
	label,
	icon,
	time,
	refused,
	view,
	handleProps,
	onRemove,
	children,
	className,
	...props
}: CombatStepCardProps) {
	const title = `${number}. ${label}`
	return (
		<li
			className={cn(
				"grid grid-cols-[auto_auto_1fr_auto_auto] items-start gap-x-2 rounded-lg border border-line bg-surface-sunken px-2 py-2 data-dragging:border-lilac data-dragging:bg-surface-raised",
				{ "border-error/70": !!refused },
				className,
			)}
			{...props}
		>
			<button
				type="button"
				aria-label={`Move step ${title}`}
				aria-description="Drag, or press the up and down arrow keys"
				className="flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded text-subtle hover:text-white focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
				{...handleProps}
			>
				<GripVertical aria-hidden="true" className="size-4" />
			</button>
			<span className={cn({ "opacity-50": !!refused })}>{icon}</span>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="flex flex-wrap items-baseline gap-x-2 text-white text-xs">
					<span className="font-semibold">{title}</span>
					{time !== undefined && (
						<span className="text-subtle tabular-nums">
							{formatSeconds(time)}
						</span>
					)}
					{view?.marks.map(({ mark, change, fromMarker }) => (
						<span key={`${mark}-${change}`} className="text-gold">
							{mark} mark {change}
							{fromMarker && ` ${FROM_MARKER}`}
						</span>
					))}
				</p>
				{refused && (
					<p className="flex items-start gap-1 text-error text-xs">
						<CircleAlert
							aria-hidden="true"
							className="mt-0.5 size-3 shrink-0"
						/>
						{refused} (left out)
					</p>
				)}
				{children}
				{!!view?.hits.length && (
					<ul
						aria-label="Hits"
						className="flex flex-col text-[0.6875rem] text-prose"
					>
						{view.hits.map((hit, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: a step's hits never reorder
							<HitLine key={index} hit={hit} />
						))}
					</ul>
				)}
				{!refused && !!view?.effects.length && (
					<ul aria-label="Effects running" className="flex flex-wrap gap-1">
						{view.effects.map((effect) => (
							<li
								key={effect}
								className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[0.625rem] text-prose"
							>
								{effect}
							</li>
						))}
					</ul>
				)}
				{view && !refused && <HealthBar share={view.healthShare} />}
			</div>
			<p className="flex flex-col items-end text-right">
				{view && view.total.final > 0 && (
					<>
						<span
							className={cn(
								"font-bold font-display text-base tabular-nums",
								view.mainType && DAMAGE_COLORS[view.mainType],
							)}
						>
							{formatDamage(view.total.final)}
						</span>
						<span className="text-[0.625rem] text-subtle tabular-nums">
							raw {formatDamage(view.total.raw)}
						</span>
					</>
				)}
			</p>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove step ${title}`}
				onClick={onRemove}
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}
