import type { RunesFile, RuneTree } from "@schemas/rune"
import { useEffect, useState } from "react"
import { LoadError } from "@/components/common/load-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunes } from "@/data/hooks/use-runes"
import { track } from "@/lib/analytics/analytics"
import type { AnalyticsEvents } from "@/lib/analytics/analytics-events"
import { cn } from "@/lib/cn"
import { preloadImages } from "@/lib/preload-images"
import {
	EMPTY_RUNE_SELECTION,
	isRuneSelectionEmpty,
	type RuneSelection,
} from "@/lib/rune-selection"
import type { RuneSummonerHint } from "@/lib/summoner-rune-interactions"
import {
	type PerkDetail,
	runeDetail,
	shardDetail,
	treeDetail,
} from "../lib/perk-detail"
import {
	pickKeystone,
	pickPrimaryRune,
	pickPrimaryTree,
	pickSecondaryRune,
	pickSecondaryTree,
	pickShard,
} from "../lib/pick-runes"
import { runeImageUrls } from "../lib/rune-image-urls"
import { RAIL_LABEL_CLASSES } from "../lib/rune-styles"
import { SHARD_ACCENT } from "../lib/tree-accent"
import { PrimaryTreeSkeleton } from "./primary-tree-skeleton"
import { RuneDetails } from "./rune-details"
import { RuneRail } from "./rune-rail"
import { RuneRailRow } from "./rune-rail-row"
import { RuneRow } from "./rune-row"
import { SecondaryTreeSkeleton } from "./secondary-tree-skeleton"
import { ShardRow } from "./shard-row"
import { SummonerInteractions } from "./summoner-interactions"
import { TreeColumn } from "./tree-column"
import { TreePicker } from "./tree-picker"

type RunePageProps = {
	patch: string
	selection: RuneSelection
	onSelectionChange: (selection: RuneSelection) => void
	/** The page's runes that react to the chosen summoner spells: badges, tooltips and a summary. */
	summonerHints?: readonly RuneSummonerHint[]
	/** Shown under the page, such as the stats the shards change (mobile). */
	children?: React.ReactNode
	className?: string
}

const NO_HINTS: readonly RuneSummonerHint[] = []

/** The rune page editor: primary tree, secondary tree (two runes) and the three stat shards. */
export function RunePage({
	patch,
	selection,
	onSelectionChange,
	summonerHints = NO_HINTS,
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
					summonerHints={summonerHints}
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
	summonerHints: readonly RuneSummonerHint[]
}

function RunePageEditor({
	runes,
	selection,
	onSelectionChange,
	summonerHints,
}: RunePageEditorProps) {
	const [described, setDescribed] = useState<PerkDetail>()
	const hintsByRune = new Map(summonerHints.map((hint) => [hint.rune.id, hint]))
	const { primary, secondary } = selection
	const primaryTree = runes.trees.find((tree) => tree.id === primary?.treeId)
	const secondaryTree = runes.trees.find(
		(tree) => tree.id === secondary?.treeId,
	)

	// Opening the tab loads every tree's images, so switching trees shows them at once.
	useEffect(() => {
		preloadImages(runeImageUrls(runes))
	}, [runes])

	function change(next: RuneSelection, pick: AnalyticsEvents["rune_picked"]) {
		if (next === selection) return
		onSelectionChange(next)
		track("rune_picked", pick)
	}

	function reset() {
		onSelectionChange(EMPTY_RUNE_SELECTION)
		track("runes_reset", {})
	}

	function describeTree(tree: RuneTree) {
		setDescribed(treeDetail(tree))
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
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-8.5 lg:gap-y-6">
				<TreeColumn
					title="Primary"
					tree={primaryTree}
					emblemSize="large"
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
							onDescribe={describeTree}
						/>
					}
				>
					{primaryTree ? (
						<RuneRail>
							<RuneRailRow isPicked={primary?.keystoneId !== undefined}>
								<p className={RAIL_LABEL_CLASSES}>Keystones</p>
								<RuneRow
									summonerHints={hintsByRune}
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
									onDescribe={(rune) =>
										setDescribed(runeDetail(rune, primaryTree))
									}
								/>
							</RuneRailRow>
							{primaryTree.rows.map((row, index) => (
								<RuneRailRow
									// Rows have no id of their own; their position is stable.
									// biome-ignore lint/suspicious/noArrayIndexKey: see above
									key={index}
									isPicked={primary?.runeIds[index] !== undefined}
								>
									<RuneRow
										summonerHints={hintsByRune}
										label={`${primaryTree.name} row ${index + 1}`}
										runes={row}
										value={primary?.runeIds[index]}
										onValueChange={(runeId) =>
											change(pickPrimaryRune(selection, index, runeId), {
												slot: "primary_rune",
												id: runeId,
											})
										}
										onDescribe={(rune) =>
											setDescribed(runeDetail(rune, primaryTree))
										}
									/>
								</RuneRailRow>
							))}
						</RuneRail>
					) : (
						<PrimaryTreeSkeleton />
					)}
				</TreeColumn>
				<div className="flex flex-col gap-8 lg:gap-6">
					<TreeColumn
						title="Secondary"
						tree={secondaryTree}
						emblemSize="medium"
						picker={
							<TreePicker
								label="Secondary tree"
								trees={runes.trees.filter(
									(tree) => tree.id !== primary?.treeId,
								)}
								value={secondary?.treeId}
								onValueChange={(treeId) =>
									change(pickSecondaryTree(selection, treeId), {
										slot: "secondary_tree",
										id: treeId,
									})
								}
								onDescribe={describeTree}
							/>
						}
					>
						{secondaryTree ? (
							<div className="flex flex-col gap-2">
								<p className={cn("ml-7.5", RAIL_LABEL_CLASSES)}>Pick 2</p>
								<RuneRail>
									{secondaryTree.rows.map((row, index) => {
										const picked = secondary?.runeIds.find((id) =>
											row.some((rune) => rune.id === id),
										)
										return (
											<RuneRailRow
												// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
												key={index}
												isPicked={picked !== undefined}
											>
												<RuneRow
													summonerHints={hintsByRune}
													label={`${secondaryTree.name} row ${index + 1}`}
													runes={row}
													value={picked}
													onValueChange={(runeId) =>
														change(
															pickSecondaryRune(
																selection,
																secondaryTree,
																runeId,
															),
															{ slot: "secondary_rune", id: runeId },
														)
													}
													onDescribe={(rune) =>
														setDescribed(runeDetail(rune, secondaryTree))
													}
												/>
											</RuneRailRow>
										)
									})}
								</RuneRail>
							</div>
						) : (
							<SecondaryTreeSkeleton />
						)}
					</TreeColumn>
					<section className={cn("flex flex-col gap-2.5", SHARD_ACCENT)}>
						<h3 className={cn("ml-7.5", RAIL_LABEL_CLASSES)}>Stat shards</h3>
						<RuneRail>
							{runes.shardRows.map((row, index) => (
								<RuneRailRow
									key={row.label}
									isPicked={selection.shardIds[index] !== undefined}
								>
									<ShardRow
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
										onDescribe={(shard) => setDescribed(shardDetail(shard))}
									/>
								</RuneRailRow>
							))}
						</RuneRail>
					</section>
				</div>
				<RuneDetails detail={described} className="lg:col-span-2" />
				{!!summonerHints.length && (
					<SummonerInteractions
						hints={summonerHints}
						className="lg:col-span-2"
					/>
				)}
			</div>
		</>
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
