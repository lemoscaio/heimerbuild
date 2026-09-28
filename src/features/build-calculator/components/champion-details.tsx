import { type ChangeEvent, useState } from "react"
import { DotLoader } from "react-spinners"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { type ComputedStats, computeStats } from "@/lib/stats/compute-stats"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import { type ChampionRoles, rolesInfo } from "../lib/roles-info"
import { formatStat, statRows } from "../lib/stats-info"

const levelOptions = Array.from(
	{ length: MAX_LEVEL - MIN_LEVEL + 1 },
	(_, index) => MIN_LEVEL + index,
).map((level) => (
	<option value={level} key={level} className="level-container__level-option">
		{level}
	</option>
))

type ChampionDetailsProps = {
	championKey: string | undefined
}

export function ChampionDetails({ championKey }: ChampionDetailsProps) {
	const { data: championInfo } = useChampion(championKey)

	const [championLevel, setChampionLevel] = useState(MIN_LEVEL)

	const {
		data: items,
		isLoading: isLoadingItems,
		isError: failedItemsLoad,
		refetch: loadItems,
	} = useItems()

	const [itemRoleFilter, setItemRoleFilter] = useState("All")

	const displayedItems = setDisplayedItems()

	function setDisplayedItems() {
		if (items) {
			const allItems = Object.keys(items)

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
		return item?.roles.includes(itemRoleFilter as ChampionRole)
	}

	const [chosenItems, setChosenItems] = useState<number[]>([])

	const computedStats =
		championInfo &&
		computeStats(
			championInfo,
			championLevel,
			items ? chosenItems.map((itemId) => items[itemId]) : [],
		)

	function handleItemClick(
		e: React.MouseEvent<HTMLElement, MouseEvent>,
		key: number,
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
	}

	function handleRoleFilterClick(
		e: React.MouseEvent<HTMLDivElement, MouseEvent>,
		role: string,
	) {
		return role === "ALL" ? setItemRoleFilter("All") : setItemRoleFilter(role)
	}

	// function handleItemStatFilterClick(e: MouseEventHandler, stat) {
	//   const statCurrentFilterValue = itemStatFilter[stat]

	//   setItemStatFilter({ ...itemStatFilter, [stat]: !statCurrentFilterValue })
	// }

	function handleLoadItemsClick() {
		loadItems()
	}

	function handleLevelChange(
		e: ChangeEvent<HTMLSelectElement | HTMLInputElement>,
	) {
		setChampionLevel(Number(e.target.value))
	}

	function createLevelSelectElement() {
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
					min={MIN_LEVEL}
					max={MAX_LEVEL}
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
					</article>,
				)
			} else {
				itemElements.push(
					<article
						className="items__item-card chosen-items__item"
						onClick={(e) => handleItemClick(e, itemId)}
					></article>,
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

	function createChampionStatsElement(stats: ComputedStats) {
		const statsElements = statRows.map(({ stat, label, icon, format }) => {
			const { base, bonus, total } = stats[stat]

			return (
				<li className="stats__stat" key={stat}>
					<img src={icon} alt="" className="stats__stat-icon" />
					<div className="stats__stat-numbers">
						{bonus !== 0 ? (
							<>
								{label}: {formatStat(total, format)} ({formatStat(base, format)}{" "}
								+{" "}
								<span className="stats__stat--additional">
									{formatStat(bonus, format)}
								</span>
								)
							</>
						) : (
							<>
								{label}: {formatStat(total, format)}
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
									{computedStats && createChampionStatsElement(computedStats)}
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
