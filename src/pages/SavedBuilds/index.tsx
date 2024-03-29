import itemStatsIcons from "../../assets/stats-icons"
import goldIcon from "../../assets/stats-icons/Gold_icon.png"

import { MdDeleteForever } from "react-icons/md"
import { useDeleteBuild } from "../../hooks/api/useDeleteBuild"
import { useGetSavedBuilds } from "../../hooks/api/useGetSavedBuilds"
import { useGetChampions } from "../../hooks/api/useGetChampions"
import { useGetItems } from "../../hooks/api/useGetItems"
import { Build } from "../../types/builds"

export function SavedBuilds() {
	const { data: builds } = useGetSavedBuilds()
	const deleteBuildMutation = useDeleteBuild({
		updater: (oldData, id) => oldData.filter((build) => build.id !== id),
	})

	const { data: items } = useGetItems()
	const { data: champions } = useGetChampions()

	async function handleDeleteBuildClick(buildId: number) {
		try {
			await deleteBuildMutation.mutateAsync(buildId)
		} catch (error) {
			console.log(error)
		}
	}

	function createChosenItemsElement(build: Build) {
		const ITEM_AMOUNT = 6

		const itemElements = []

		for (let i = 0; i < ITEM_AMOUNT; i++) {
			const itemId = build.items[i]

			if (items && itemId) {
				itemElements.push(
					<div className="build-card__chosen-item">
						<img
							src={items[itemId].icon}
							className="build-card__chosen-item-image"
						/>
					</div>
				)
			} else {
				itemElements.push(<div className="build-card__chosen-item"></div>)
			}
		}

		return itemElements
	}

	function createStatsElement(build: Build) {
		return (
			<>
				<div className="build-card__stats-column">
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.attackDamage}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.attackDamage}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.armor}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.armor}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.attackSpeed}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.attackSpeed}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.criticalStrike}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.criticalStrike}
					</p>
				</div>
				<div className="build-card__stats-column">
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.abilityPower}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.abilityPower}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.magicResist}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.magicResistance}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.abilityHaste}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.abilityHaste}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.moveSpeed}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.movespeed}
					</p>
				</div>
				<div className="build-card__stats-column">
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.health}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.health}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.armorPenetration}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.lethality} | {build.stats.armorPenetration}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.lifeSteal}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.lifeSteal}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.attackRange}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.attackRange}
					</p>
				</div>
				<div className="build-card__stats-column">
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.mana}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.mana}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.magicPenetration}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.flatMagicPenetration} |{" "}
						{build.stats.percentageMagicPenetration}%
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.omniVamp}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.physicalVamp} | {build.stats.omniVamp}
					</p>
					<p className="build-card__stat">
						<img
							src={itemStatsIcons.tenacity}
							alt=""
							className="build-card__stat-icon"
						/>
						{build.stats.tenacity}
					</p>
				</div>
			</>
		)
	}

	return (
		<div className="page-container page-container--user-page">
			<main className="user-page">
				<h1 className="user-page__page-label">Saved builds</h1>
				<section className="user-page__builds">
					{builds &&
						builds.map((build) => {
							return (
								<div className="user-page__card-container card-container">
									<div className="card-container__additional-commands">
										<MdDeleteForever
											className="card-container__delete-icon"
											onClick={() => handleDeleteBuildClick(build.id)}
										/>
									</div>
									<article className="user-page__build-card build-card">
										<div className="build-card__left-column">
											{/* <div className="build-card__champion">
													{champions && (
														<img
															src={champions[build.championKey].icon}
															alt={champions[build.championKey].name}
															className="build-card__champion-image"
														/>
													)}
													<h2 className="build-card__champion-name">
														{build.championName}
													</h2>
													<h3 className="build-card__champion-level">
														Level: {build.level}
													</h3>
												</div> */}
											{build.cost !== -1 && (
												<div className="build-card__build-cost">
													<p>
														{" "}
														Cost: {build.cost}{" "}
														<img
															src={goldIcon}
															alt="Gold"
															className="build-card__build-cost--icon"
														/>
													</p>
												</div>
											)}
										</div>
										<div className="build-card__right-column">
											<div className="build-card__chosen-items">
												{createChosenItemsElement(build)}
											</div>
											<div className="build-card__stats-container">
												{createStatsElement(build)}
											</div>
										</div>
									</article>
								</div>
							)
						})}
				</section>
			</main>
		</div>
	)
}
