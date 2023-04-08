import { ChangeEvent, useCallback, useState } from "react"
import { useParams } from "react-router-dom"

import { useAuth } from "../../hooks/useAuth"

import { DotLoader } from "react-spinners"
import { usePostSaveBuild } from "../../hooks/api/usePostSaveBuild"
import { useGetChampionDetails } from "../../hooks/api/useGetChampionDetails"
import { useGetItems } from "../../hooks/api/useGetItems"
import { Champion } from "../../types/champion"
import { ChampionRoles, rolesInfo } from "../../utils/rolesInfo"
import { statsInfo } from "../../utils/statsInfo"

export function ChampionDetails() {
	const MAX_LEVEL = 18

	const { user } = useAuth()
	const { championKey } = useParams()

	const { data: championInfo } = useGetChampionDetails(championKey)

	const [championLevel, setChampionLevel] = useState(0)

	const [saveBuildButtonContent, setSaveBuildButtonContent] =
		useState("Save Build")

	const {
		data: items,
		isLoading: isLoadingItems,
		isError: failedItemsLoad,
		refetch: loadItems,
	} = useGetItems()

	const [itemRoleFilter, setItemRoleFilter] = useState("All")

	const displayedItems = setDisplayedItems()

	function setDisplayedItems() {
		if (items) {
			const allItems = Object.keys(items).filter((itemId) => {
				const item = items[itemId]
				return item?.shop?.purchasable
			})

			const roleFilteredItems =
				itemRoleFilter !== "All"
					? allItems.filter((item) => filterItemsByRole(Number(item)))
					: allItems

			return roleFilteredItems
		}
	}

	// const [itemStatFilter, setItemStatFilter] = useState(() => {
	//   const setOfItemStatFilter = {}
	//   for (let key in statsInfo) {
	//     setOfItemStatFilter[key] = false
	//   }
	//   return { ...setOfItemStatFilter }
	// })

	// function filterItemsByStat(itemId) {
	//   const item = items[itemId]
	//   const itemTags = item.shop.tags
	//   const matchedFilterStat = Object.keys(item.stats).filter((stat) => {
	//     if (
	//       itemStatFilter[stat] === true &&
	//       (item.stats[stat].flat > 0 || item.stats[stat].percent > 0)
	//     ) {
	//       return true
	//     }
	//   })

	//   if (matchedFilterStat.length > 0) return true
	// }

	function filterItemsByRole(itemId: number) {
		const item = items && items[itemId]
		const itemTags = item?.shop.tags
		if (itemTags?.includes(itemRoleFilter)) {
			return true
		}
	}

	const [chosenItems, setChosenItems] = useState<number[]>([])

	type ChampionStatsType = {
		[key: string]: number
	}

	// TODO IMPROVE STATS TYPE

	const updateEachStatOnLeveLChange = useCallback(
		(stats: Champion["stats"], championStats: ChampionStatsType) => {
			for (let stat in stats) {
				if (stat === "attackSpeed") {
					const newSpeedvalue =
						stats[stat].flat *
						(1 + (championLevel * stats[stat].perLevel) / 100)
					championStats[stat] = Number(newSpeedvalue.toFixed(2))
				} else {
					championStats[stat] = Number(
						(stats[stat].flat + championLevel * stats[stat].perLevel).toFixed(2)
					)
				}
			}

			statsInfo.order.forEach((stat) => {
				if (championStats[stat] === undefined) {
					championStats[stat] = 0
				}
			})
		},
		[championLevel]
	)

	const updateEachStatOnItemChange = useCallback(
		(stats: Champion["stats"], championStats: ChampionStatsType) => {
			if (items && chosenItems.length > 0) {
				chosenItems.forEach((itemId) => {
					const item = items[itemId]

					Object.keys(item.stats).map((statName) => {
						const stat = item.stats[statName]

						let correctLabel
						if (championStats[statName] !== undefined) {
							correctLabel = statName
						} else if (
							championStats[statsInfo.alternativeLabels[statName]?.label] !==
							undefined
						) {
							correctLabel = statsInfo.alternativeLabels[statName].label
						} else if (statName === "magicPenetration") {
							const oldFlatMagicPenValue = championStats["flatMagicPenetration"]
							const oldPercentMagicPenValue =
								championStats["percentageMagicPenetration"]

							championStats["flatMagicPenetration"] =
								oldFlatMagicPenValue + stat.flat
							championStats["percentageMagicPenetration"] =
								oldPercentMagicPenValue + 1 * stat.percent
						}

						if (correctLabel !== undefined) {
							const oldStatValue = championStats[correctLabel]

							if (correctLabel === "attackSpeed") {
								const newSpeedvalue = oldStatValue * (1 + stat.flat / 100)
								championStats[correctLabel] = Number(newSpeedvalue.toFixed(2))
							} else {
								championStats[correctLabel] =
									oldStatValue + stat.flat + 1 * stat.percent
							}
						}
					})
				})
			}
		},
		[chosenItems]
	)

	function setBaseChampionStats() {
		const championStats: ChampionStatsType = {}

		championInfo &&
			updateEachStatOnLeveLChange(championInfo.stats, championStats)

		return championStats
	}

	function setChampionStats() {
		const championStats: ChampionStatsType = {}

		championInfo &&
			updateEachStatOnLeveLChange(championInfo.stats, championStats)
		championInfo &&
			updateEachStatOnItemChange(championInfo.stats, championStats)

		return championStats
	}

	const baseChampionstats = setBaseChampionStats()
	const championStats = setChampionStats()

	function handleItemClick(
		e: React.MouseEvent<HTMLElement, MouseEvent>,
		key: number
	) {
		const indexOfItem = chosenItems.indexOf(key)

		if (indexOfItem === -1 && chosenItems.length < 6) {
			chosenItems.push(key)
			setChosenItems([...chosenItems])
		}
		if (indexOfItem !== -1) {
			chosenItems.splice(indexOfItem, 1)
			setChosenItems([...chosenItems])
		}

		setSaveBuildButtonContent("Save Build")
	}

	function handleRoleFilterClick(
		e: React.MouseEvent<HTMLDivElement, MouseEvent>,
		role: string
	) {
		return role === "ALL" ? setItemRoleFilter("All") : setItemRoleFilter(role)
	}

	// function handleItemStatFilterClick(e: MouseEventHandler, stat) {
	//   const statCurrentFilterValue = itemStatFilter[stat]

	//   setItemStatFilter({ ...itemStatFilter, [stat]: !statCurrentFilterValue })
	// }

	const saveBuildMutation = usePostSaveBuild()

	function handleSaveBuildClick() {
		const statsData: ChampionStatsType = {}

		statsInfo.order.forEach((stat) => {
			statsData[stat] = championStats[stat]
		})

		const buildData = {
			championName: championInfo?.name,
			championKey: championInfo?.key,
			level: championLevel,
			items: chosenItems,
			stats: statsData,
		}

		setSaveBuildButtonContent("Saving...")

		try {
			saveBuildMutation.mutateAsync(buildData)
			setTimeout(() => {
				setSaveBuildButtonContent("Saved!")
			}, 1000)
		} catch (error) {
			console.log(error)
			setSaveBuildButtonContent("Error")
			setTimeout(() => {
				setSaveBuildButtonContent("Save build")
			}, 1500)
		}
	}

	function handleLoadItemsClick() {
		loadItems()
	}

	function handleLevelChange(
		e: ChangeEvent<HTMLSelectElement | HTMLInputElement>
	) {
		setChampionLevel(Number(e.target.value))
		setSaveBuildButtonContent("Save Build")
	}

	function createSaveBuildButtonElement() {
		const disabled =
			saveBuildButtonContent === "Saving..." ||
			saveBuildButtonContent === "Error"

		return (
			user && (
				<button
					className="champion-info__save-build"
					onClick={handleSaveBuildClick}
					disabled={disabled}
				>
					{saveBuildButtonContent}
				</button>
			)
		)
	}

	function createLevelSelectElement() {
		const levelOptions = []

		for (let i = 0; i < MAX_LEVEL; i++) {
			levelOptions.push(
				<option value={i} key={i} className="level-container__level-option">
					{i + 1}
				</option>
			)
		}
		return (
			<div className="champion-info__level-container level-container">
				<label htmlFor="championLevel" className="level-container__label">
					Current Level:
					<select
						className="level-container__level-select"
						name="championLevel"
						id="championLevel"
						value={championLevel}
						onChange={handleLevelChange}
					>
						{levelOptions}
					</select>
				</label>
				<input
					className="level-container__level-slider level-slider"
					type="range"
					min="0"
					max="17"
					step="1"
					value={championLevel}
					onChange={handleLevelChange}
					id="myRange"
				></input>
			</div>
		)
	}

	// function createChampionTypesElement() {
	//   return (
	//     <div>
	//       Type:{" "}
	//       {championInfo.rolesInfo.map((role, index) => {
	//         if (index === championInfo.rolesInfo.length - 1) {
	//           return <span>{role}</span>
	//         } else {
	//           return <span>{role},</span>
	//         }
	//       })}
	//     </div>
	//   )
	// }

	// function createChampionLoreElement() {
	//   return <div>{championInfo.lore}</div>
	// }

	// function createAttackTypeElement() {
	//   return <div>Attack type: {championInfo.attackType}</div>
	// }

	function createChosenItemsElement() {
		const ITEM_AMOUNT = 6

		const itemElements = []

		for (let i = 0; i < ITEM_AMOUNT; i++) {
			const itemId = chosenItems[i]

			if (items && items[itemId] !== undefined) {
				itemElements.push(
					<article
						className="items__item-card chosen-items__item"
						onClick={(e) => handleItemClick(e, itemId)}
					>
						<img
							src={items[itemId].icon}
							className="chosen-items__item-image"
						/>
					</article>
				)
			} else {
				itemElements.push(
					<article
						className="items__item-card chosen-items__item"
						onClick={(e) => handleItemClick(e, itemId)}
					></article>
				)
			}
		}

		return (
			<div className="champion-info__chosen-items chosen-items">
				{itemElements}
			</div>
		)
	}

	function createItemsElement() {
		return (
			<div className="champion-info__items items">
				<div className="items__filter-row">
					{Object.keys(rolesInfo).map((role) => {
						return (
							<div
								className="items__filter-roles"
								onClick={(e) => handleRoleFilterClick(e, role)}
							>
								<img
									src={rolesInfo[role as ChampionRoles].icon}
									className="items__role-icon"
								/>
							</div>
						)
					})}
				</div>
				<div className="items__second-row">
					{/* <div className="items__item-filter-stats">
            {Object.keys(statsInfo.labels).map((stat) => {
              return (
                <div
                  className="items__item-filter-stats"
                  onClick={(e) => handleItemStatFilterClick(e, stat)}
                >
                  <img
                    src={statsInfo.labels[stat].icon}
                    className="items__item-role-icon"
                  />
                </div>
              )
            })}
          </div> */}
					<div className="items__list">
						{displayedItems &&
							displayedItems.map((itemId) => {
								const item = items && items[itemId]

								return (
									<article
										className="items__item-card"
										onClick={(e) => handleItemClick(e, Number(itemId))}
									>
										<img src={item?.icon} className="items__item-image" />
									</article>
								)
							})}
						{isLoadingItems && (
							<DotLoader color={"white"} className="items__loader" />
						)}
						{failedItemsLoad && (
							<div className="items__load-error-container load-error-container">
								<p>Something went wrong!</p>
								<button
									className="items__load-button load-button"
									onClick={handleLoadItemsClick}
								>
									Click here to try again
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	function createChampionStatsElement() {
		// const statsElements = []

		const statsElements = statsInfo.order.map((stat) => {
			const totalStat = championStats[stat]
			const baseStat = baseChampionstats[stat]
			const additionalStat = Number((totalStat - baseStat).toFixed(2))

			const statIcon =
				statsInfo.labels[stat]?.icon && statsInfo.labels[stat]?.icon
			const statLabel = statsInfo.labels[stat].label
			const statSufix =
				statsInfo.labels[stat].suffix && statsInfo.labels[stat].suffix

			return (
				<li className="stats__stat">
					<img src={statIcon} className="stats__stat-icon"></img>
					<div className="stats__stat-numbers">
						{additionalStat ? (
							<>
								{statLabel}: {totalStat}
								{statSufix} ({baseStat} +{" "}
								<span className="stats__stat--additional">
									{additionalStat}
								</span>
								)
							</>
						) : (
							<>
								{statLabel}: {totalStat}
								{statSufix}
							</>
						)}
					</div>
				</li>
			)
		})

		const statsElementsRow1Col1 = statsElements.slice(0, 8)
		const statsElementsRow2Col1 = statsElements.slice(8, 12)
		const statsElementsRow1Col2 = statsElements.slice(12, 19)
		const statsElementsRow2Col2 = statsElements.slice(19, 25)

		return (
			<div className="champion-info__stats stats">
				<ul className="stats__group stats__group-1">{statsElementsRow1Col1}</ul>
				<ul className="stats__group stats__group-2">{statsElementsRow1Col2}</ul>
				<ul className="stats__group stats__group-3">{statsElementsRow2Col1}</ul>
				<ul className="stats__group stats__group-4">{statsElementsRow2Col2}</ul>
			</div>
		)
	}

	return (
		<>
			<div className="width-container">
				<div className="page-container page-container--champion-page">
					<div className="widthWrapper">
						{championInfo ? (
							<main className="champion-page">
								<div className="champion-page__champion-info champion-info">
									<div className="champion-info__header">
										<img
											src={championInfo.icon}
											alt=""
											className="champion-info__header-image"
										/>
										<div className="champion-info__name-title">
											<h3 className="champion-info__name">
												{championInfo.name}
											</h3>
											<h4 className="champion-info__title">
												{championInfo.title}
											</h4>
										</div>
										{createSaveBuildButtonElement()}
									</div>
									{/* {createChampionLoreElement()} */}
									{createLevelSelectElement()}
									{/* {createChampionTypesElement()} */}
									{/* {createAttackTypeElement()} */}
									{/* <ChampionSkills
                abilities={championInfo.abilities}
              ></ChampionSkills> */}
									{createChosenItemsElement()}
									{createItemsElement()}
									{createChampionStatsElement()}
								</div>
							</main>
						) : (
							<></>
						)}
					</div>
				</div>
			</div>
		</>
	)
}
