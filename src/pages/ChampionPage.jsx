import axios from "axios"
import { useCallback, useEffect, useMemo, useState } from "preact/hooks"
import { useParams } from "react-router-dom"

import { ChampionSkills } from "../components/ChampionSkills"

export default function ChampionPage() {
  console.log("Rendered")

  const { VITE_APP_API_URL } = import.meta.env
  const MAX_LEVEL = 18

  const { championKey } = useParams()

  const statsOrder = [
    "attackDamage",
    "abilityPower",
    "armor",
    "magicResistance",
    "attackSpeed",
    "abilityHaste",
    "criticalStrike",
    "movespeed",
    "health",
    "healthRegen",
    "mana",
    "manaRegen",
    "lethality",
    "armorPenetration",
    "flatMagicPenetration",
    "percentageMagicPenetration",
    "lifeSteal",
    "physicalVamp",
    "omniVamp",
    "attackRange",
    "tenacity",
  ]
  const statsLabels = {
    attackDamage: {
      label: "Attack Damage",
      short_label: "AD",
    },
    abilityPower: {
      label: "Ability Power",
      short_label: "AP",
    },
    armor: {
      label: "Armor",
      short_label: "Armor",
    },
    magicResistance: { label: "Magic Resistance", short_label: "MR" },
    attackSpeed: {
      label: "Attack Speed",
      short_label: "Atk Speed",
      suffix: "%",
    },
    abilityHaste: {
      label: "Ability Haste",
      short_label: "AH",
    },
    criticalStrike: {
      label: "Critical Strike",
      short_label: "Crit",
      anotherAlternativeLabel: "criticalStrikeChance",
      suffix: "%",
    },
    movespeed: {
      label: "Movement Speed",
      short_label: "Move Speed",
    },
    health: {
      label: "Health",
      short_label: "HP",
    },
    healthRegen: {
      label: "Health Regen",
      short_label: "HP Regen",
      suffix: "%",
    },
    mana: {
      label: "Mana",
      short_label: "MP",
    },
    manaRegen: {
      label: "Mana Regen",
      short_label: "MP Regen",
      suffix: "%",
    },
    lethality: {
      label: "Lethality",
      short_label: "Lethality",
    },
    armorPenetration: {
      label: "Armor Penetration",
      short_label: "Armor Pen",
      suffix: "%",
    },
    flatMagicPenetration: {
      label: "Flat Magic Penetration",
      short_label: "Flat Magic Pen",
    },
    percentageMagicPenetration: {
      label: "Percentage Magic Penetration",
      short_label: "Percentage Magic Pen",
      suffix: "%",
    },
    lifeSteal: {
      label: "Life Steal",
      short_label: "Life Steal",
      suffix: "%",
    },
    physicalVamp: {
      label: "Physical Vamp",
      short_label: "Physical Vamp",
      suffix: "%",
    },
    omniVamp: {
      label: "Omnivamp",
      short_label: "Omnivamp",
      suffix: "%",
    },
    attackRange: {
      label: "Attack Range",
      short_label: "Atk Range",
    },
    tenacity: {
      label: "Tenacity",
      short_label: "Tenacity",
      suffix: "%",
    },
  }
  const alternativeLabels = {
    attack_damage: {
      label: "attackDamage",
    },
    ability_power: {
      label: "abilityPower",
    },

    attack_speed: {
      label: "attackSpeed",
    },
    ability_haste: {
      label: "abilityHaste",
    },
    critical_strike_chance: {
      label: "criticalStrike",
    },
    criticalStrikeChance: {
      label: "criticalStrike",
    },

    health_regen: {
      label: "healthRegen",
    },
    mana: {
      label: "Mana",
      short_label: "MP",
    },
    maga_regen: {
      label: "manaRegen",
    },
    lethality: {
      label: "Lethality",
      short_label: "Lethality",
    },
    armor_penetration: {
      label: "armorPenetration",
    },
    magic_penetration: {
      label: "flatMagicPenetration",
    },
    magic_penetration: {
      label: "percentageMagicPenetration",
    },
    lifesteal: {
      label: "lifeSteal",
    },

    omnivamp: {
      label: "omniVamp",
    },
  }

  const [championInfo, setChampionInfo] = useState(() => {
    axios
      .get(`${VITE_APP_API_URL}/champions/${championKey}`)
      .then((response) => {
        const championData = response.data

        setChampionInfo(championData)
      })
      .catch((error) => {
        console.log(error)
      })
  })

  const [chosenItems, setChosenItems] = useState([])

  const [items, setItems] = useState(() => {
    axios
      .get(`${VITE_APP_API_URL}/items`)
      .then((response) => {
        const items = response.data
        setItems(items)
        console.log(items)
      })
      .catch((error) => {
        console.log(error)
      })
  })

  const [championLevel, setChampionLevel] = useState(0)

  const updateEachStatOnLeveLChange = useCallback(
    (stats, championStats) => {
      console.log(
        `🚀 -> file: ChampionPage.jsx -> line 217 -> ChampionPage -> stats`,
        stats,
      )
      for (let stat in stats) {
        if (stat === "attackSpeed") {
          const newSpeedvalue =
            stats[stat].flat *
            (1 + (championLevel * stats[stat].perLevel) / 100)
          championStats[stat] = Number(newSpeedvalue.toFixed(2))
        } else {
          championStats[stat] = Number(
            (stats[stat].flat + championLevel * stats[stat].perLevel).toFixed(
              2,
            ),
          )
        }
      }

      statsOrder.forEach((stat) => {
        if (championStats[stat] === undefined) {
          championStats[stat] = 0
        }
      })
    },
    [championLevel],
  )

  const updateEachStatOnItemChange = useCallback(
    (stats, championStats) => {
      if (items && chosenItems.length > 0) {
        chosenItems.forEach((itemId) => {
          const item = items[itemId]
          console.log("All stats ", item.stats)
          Object.keys(item.stats).map((statName) => {
            const stat = item.stats[statName]

            let correctLabel
            if (championStats[statName] !== undefined) {
              correctLabel = statName
            } else if (
              championStats[alternativeLabels[statName]?.label] !== undefined
            ) {
              correctLabel = alternativeLabels[statName].label
            }

            if (correctLabel !== undefined) {
              const oldStatValue = championStats[correctLabel]
              console.log("Old ", statName, championStats[correctLabel])
              console.log("New ", statName, stat.flat)

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
    [chosenItems],
  )

  function setChampionStats() {
    const championStats = {}

    championInfo &&
      updateEachStatOnLeveLChange(championInfo.stats, championStats)
    championInfo &&
      updateEachStatOnItemChange(championInfo.stats, championStats)

    return championStats
  }

  const championStats = setChampionStats()

  function handleLevelChange(e) {
    setChampionLevel(Number(e.target.value))
  }

  function createChampionTypesElement() {
    return (
      <div>
        Type:{" "}
        {championInfo.roles.map((role, index) => {
          if (index === championInfo.roles.length - 1) {
            return <span>{role}</span>
          } else {
            return <span>{role},</span>
          }
        })}
      </div>
    )
  }

  function createChampionLoreElement() {
    return <div>{championInfo.lore}</div>
  }

  function createAttackTypeElement() {
    return <div>Attack type: {championInfo.attackType}</div>
  }

  function handleItemClick(e, key) {
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
            <img src={items[itemId].icon} className="items__item-image" />
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

    return itemElements
  }

  function createLevelSelectElement() {
    const levelOptions = []

    for (let i = 0; i < MAX_LEVEL; i++) {
      levelOptions.push(
        <option value={i} key={i}>
          {i + 1}
        </option>,
      )
    }
    return (
      <div className="champion-info__level-container level-container">
        <label htmlFor="championLevel" className="level-container__label">
          Current Level:{" "}
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
          className="level-container__level-slider"
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

  function createChampionStatsElement() {
    // const statsElements = []

    const statsElements = statsOrder.map((stat) => {
      return (
        <li>
          {" "}
          {statsLabels[stat].label}: {championStats[stat]}
          {statsLabels[stat].suffix && statsLabels[stat].suffix}
        </li>
      )
    })

    return (
      <div>
        <ul>{statsElements.map((statElement) => statElement)}</ul>
      </div>
    )
  }

  // TODO remove when no longer necessary

  // function quickConsoleLogSpecificItems() {
  //   items &&
  //     Object.keys(items).forEach((itemKey) => {
  //       const item = items[itemKey]
  //       Object.keys(item.stats).map((statKey) => {
  //         const stat = item.stats[statKey]
  //         if (statKey === "attackSpeed" || statKey === "attack_speed") {
  //           console.log("Flat: ", stat.flat, " Percent: ", stat.percent)

  //           // console.log(item)
  //         } else {
  //           // console.log("não tem")
  //         }
  //       })
  //     })
  // }
  // console.log(quickConsoleLogSpecificItems())

  return (
    <main className="container">
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
                  <h3 className="champion-info__name">{championInfo.name}</h3>
                  <h4 className="champion-info__title">{championInfo.title}</h4>
                </div>
              </div>
              {/* {createChampionLoreElement()} */}
              {createLevelSelectElement()}
            </div>
            <div>
              {/* {createChampionTypesElement()} */}
              {/* {createAttackTypeElement()} */}
              {createChampionStatsElement()}
            </div>
            <div>
              {/* <ChampionSkills
                abilities={championInfo.abilities}
              ></ChampionSkills> */}
            </div>
            <div className="champion-page__chosen-items chosen-items">
              {createChosenItemsElement()}
            </div>
            <div className="champion-page__items items">
              {items &&
                Object.keys(items).map((itemId) => {
                  const item = items[itemId]

                  return (
                    <article
                      className="items__item-card"
                      onClick={(e) => handleItemClick(e, itemId)}
                    >
                      <img src={item.icon} className="items__item-image" />
                    </article>
                  )
                })}
            </div>
          </main>
        ) : (
          <></>
        )}
      </div>
    </main>
  )
}
