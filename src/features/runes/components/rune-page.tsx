import { useState } from "react"
import { LoadError } from "@/components/common/load-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunes } from "@/data/hooks/use-runes"
import { track } from "@/lib/analytics/analytics"
import type { AnalyticsEvents } from "@/lib/analytics/analytics-events"
import { cn } from "@/lib/cn"
import {
	EMPTY_RUNE_SELECTION,
	isRuneSelectionEmpty,
	type RuneSelection,
} from "@/lib/rune-selection"
import type {
	RunesFile,
	RuneTree,
} from "../../../../scripts/sync-data/schemas/rune"
import {
	pickKeystone,
	pickPrimaryRune,
	pickPrimaryTree,
	pickSecondaryRune,
	pickSecondaryTree,
	pickShard,
} from "../lib/pick-runes"
import { treeAccentClass } from "../lib/tree-accent"
import { RuneDetails } from "./rune-details"
import { type DescribedPerk, RuneRow } from "./rune-row"
import { ShardRow } from "./shard-row"
import { TreePicker } from "./tree-picker"

type RunePageProps = {
	patch: string
	selection: RuneSelection
	onSelectionChange: (selection: RuneSelection) => void
	/** Shown under the page, such as the stats the shards change (mobile). */
	children?: React.ReactNode
	className?: string
}

/** The rune page editor: primary tree, secondary tree (two runes) and the three stat shards. */
export function RunePage({
	patch,
	selection,
	onSelectionChange,
	children,
	className,
}: RunePageProps) {
	const runesQuery = useRunes(patch)

	return (
		<section
			aria-label="Rune page"
			className={cn("flex flex-col gap-4", className)}
		>
			{runesQuery.isError ? (
				<LoadError onRetry={() => runesQuery.refetch()}>
					Could not load the runes.
				</LoadError>
			) : runesQuery.data ? (
				<RunePageEditor
					runes={runesQuery.data}
					selection={selection}
					onSelectionChange={onSelectionChange}
				/>
			) : (
				<RunePageSkeleton />
			)}
			{children}
		</section>
	)
}

type RunePageEditorProps = {
	runes: RunesFile
	selection: RuneSelection
	onSelectionChange: (selection: RuneSelection) => void
}

function RunePageEditor({
	runes,
	selection,
	onSelectionChange,
}: RunePageEditorProps) {
	const [described, setDescribed] = useState<DescribedPerk>()
	const { primary, secondary } = selection
	const primaryTree = runes.trees.find((tree) => tree.id === primary?.treeId)
	const secondaryTree = runes.trees.find(
		(tree) => tree.id === secondary?.treeId,
	)

	function change(next: RuneSelection, pick: AnalyticsEvents["rune_picked"]) {
		if (next === selection) return
		onSelectionChange(next)
		track("rune_picked", pick)
	}

	function reset() {
		onSelectionChange(EMPTY_RUNE_SELECTION)
		track("runes_reset", {})
	}

	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-bold font-display text-base">Rune page</h2>
				<Button
					variant="ghost"
					size="sm"
					className="max-lg:h-11"
					disabled={isRuneSelectionEmpty(selection)}
					onClick={reset}
				>
					Reset runes
				</Button>
			</div>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-7">
				<TreeColumn
					title="Primary"
					tree={primaryTree}
					className={treeAccentClass(primaryTree?.key)}
					picker={
						<TreePicker
							label="Primary tree"
							trees={runes.trees}
							value={primary?.treeId}
							onValueChange={(treeId) =>
								change(pickPrimaryTree(selection, treeId), {
									slot: "primary_tree",
									id: treeId,
								})
							}
							onDescribe={setDescribed}
						/>
					}
				>
					{primaryTree && (
						<>
							<RuneRow
								label={`${primaryTree.name} keystone`}
								size="keystone"
								runes={primaryTree.keystones}
								value={primary?.keystoneId}
								onValueChange={(runeId) =>
									change(pickKeystone(selection, runeId), {
										slot: "keystone",
										id: runeId,
									})
								}
								onDescribe={setDescribed}
								className="border-primary-2 border-b pb-3"
							/>
							{primaryTree.rows.map((row, index) => (
								<RuneRow
									// Rows have no id of their own; their position is stable.
									// biome-ignore lint/suspicious/noArrayIndexKey: see above
									key={index}
									label={`${primaryTree.name} row ${index + 1}`}
									runes={row}
									value={primary?.runeIds[index]}
									onValueChange={(runeId) =>
										change(pickPrimaryRune(selection, index, runeId), {
											slot: "primary_rune",
											id: runeId,
										})
									}
									onDescribe={setDescribed}
								/>
							))}
						</>
					)}
				</TreeColumn>
				<div className="flex flex-col gap-6">
					<TreeColumn
						title="Secondary"
						hint="pick 2"
						tree={secondaryTree}
						className={treeAccentClass(secondaryTree?.key)}
						picker={
							<TreePicker
								label="Secondary tree"
								trees={runes.trees}
								value={secondary?.treeId}
								unavailableTreeId={primary?.treeId}
								onValueChange={(treeId) =>
									change(pickSecondaryTree(selection, treeId), {
										slot: "secondary_tree",
										id: treeId,
									})
								}
								onDescribe={setDescribed}
							/>
						}
					>
						{secondaryTree?.rows.map((row, index) => (
							<RuneRow
								// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
								key={index}
								label={`${secondaryTree.name} row ${index + 1}`}
								size="small"
								runes={row}
								value={secondary?.runeIds.find((id) =>
									row.some((rune) => rune.id === id),
								)}
								onValueChange={(runeId) =>
									change(pickSecondaryRune(selection, secondaryTree, runeId), {
										slot: "secondary_rune",
										id: runeId,
									})
								}
								onDescribe={setDescribed}
							/>
						))}
					</TreeColumn>
					<div className="flex flex-col gap-2">
						<h3 className="font-bold font-display text-gold text-sm">
							Stat shards
						</h3>
						{runes.shardRows.map((row, index) => (
							<ShardRow
								key={row.label}
								label={row.label}
								shards={row.shardIds.flatMap((id) =>
									runes.shards.filter((shard) => shard.id === id),
								)}
								value={selection.shardIds[index]}
								onValueChange={(shardId) =>
									change(pickShard(selection, index, shardId), {
										slot: "shard",
										id: shardId,
									})
								}
								onDescribe={setDescribed}
							/>
						))}
					</div>
				</div>
			</div>
			<RuneDetails perk={described} />
		</>
	)
}

type TreeColumnProps = {
	title: string
	hint?: string
	tree: RuneTree | undefined
	picker: React.ReactNode
	children: React.ReactNode
	className?: string
}

function TreeColumn({
	title,
	hint,
	tree,
	picker,
	children,
	className,
}: TreeColumnProps) {
	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{picker}
			<h3 className="font-bold font-display text-(--tree) text-sm">
				{tree ? tree.name : `${title} tree`}
				{!!hint && tree && (
					<span className="font-normal text-subtle"> · {hint}</span>
				)}
			</h3>
			{tree ? (
				children
			) : (
				<p className="text-subtle text-xs">
					Choose a {title.toLowerCase()} tree.
				</p>
			)}
		</div>
	)
}

function RunePageSkeleton() {
	return (
		<div role="status" className="flex flex-col gap-3">
			<span className="sr-only">Loading runes</span>
			<Skeleton className="h-9 w-56 rounded-full" />
			<Skeleton className="h-12 w-64 rounded-full" />
			<Skeleton className="h-10 w-48 rounded-full" />
			<Skeleton className="h-10 w-48 rounded-full" />
		</div>
	)
}
