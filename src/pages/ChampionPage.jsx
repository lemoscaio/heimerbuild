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
    "moveSpeed",
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
    },
    abilityHaste: {
      label: "Ability Haste",
      short_label: "AH",
    },
    criticalStrike: {
      label: "Critical Strike",
      short_label: "Crit",
    },
    moveSpeed: {
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
    },
    mana: {
      label: "Mana",
      short_label: "MP",
    },
    manaRegen: {
      label: "Mana Regen",
      short_label: "MP Regen",
    },
    lethality: {
      label: "Lethality",
      short_label: "Lethality",
    },
    armorPenetration: {
      label: "Armor Penetration",
      short_label: "Armor Pen",
    },
    flatMagicPenetration: {
      label: "Flat Magic Penetration",
      short_label: "Flat Magic Pen",
    },
    percentageMagicPenetration: {
      label: "Percentage Magic Penetration",
      short_label: "Percentage Magic Pen",
    },
    lifeSteal: {
      label: "Life Steal",
      short_label: "Life Steal",
    },
    physicalVamp: {
      label: "Physical Vamp",
      short_label: "Physical Vamp",
    },
    omniVamp: {
      label: "Omnivamp",
      short_label: "Omnivamp",
    },
    attackRange: {
      label: "Attack Range",
      short_label: "Atk Range",
    },
    tenacity: {
      label: "Tenacity",
      short_label: "Tenacity",
    },
  }

  const [championInfo, setChampionInfo] = useState(() => {
    axios
      .get(`${VITE_APP_API_URL}/champions/${championKey}`)
      .then((response) => {
        const championData = response.data
        championData.stats.moveSpeed = championData.stats.movespeed
        delete championData.stats.movespeed
        setChampionInfo(championData)
      })
      .catch((error) => {
        console.log(error)
      })
  })
  const [championLevel, setChampionLevel] = useState(0)

  // const [championDisplayInfo, setChampionDisplayInfo] = useState({})

  const updateEachStat = useCallback(
    (stats) => {
      const newStats = {}

      for (let stat in stats) {
        newStats[stat] = Number(
          (stats[stat].flat + championLevel * stats[stat].perLevel).toFixed(2),
        )
      }

      statsOrder.forEach((stat) => {
        if (newStats[stat] === undefined) {
          newStats[stat] = 0
        }
      })

      return newStats
    },
    [championLevel],
  )

  const championStats = championInfo ? updateEachStat(championInfo.stats) : {}

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
      <div>
        <label htmlFor="championLevel">Level: </label>
        <input
          type="range"
          min="0"
          max="17"
          step="1"
          value={championLevel}
          onChange={handleLevelChange}
          class="slider"
          id="myRange"
        ></input>
        <select
          name="championLevel"
          id="championLevel"
          value={championLevel}
          onChange={handleLevelChange}
        >
          {levelOptions}
        </select>
      </div>
    )
  }

  function createChampionStatsElement() {
    // const statsElements = []

    const statsElements = statsOrder.map((stat) => {
      return (
        <li>
          {" "}
          {statsLabels[stat].label}: {championStats[stat]}{" "}
        </li>
      )
    })

    return (
      <div>
        <ul>{statsElements.map((statElement) => statElement)}</ul>
      </div>
    )
  }

  return (
    <main className="container">
      <div className="widthWrapper">
        {championInfo ? (
          <div>
            <div className="champion-info">
              <div className="champion-info__header">
                <img
                  src={championInfo.icon}
                  alt=""
                  className="champion-info__header-image"
                />
                <div className="champion-info__name-title">
                  <h3 className="info-container__name">{championInfo.name}</h3>
                  <h4 className="info-container__title">
                    {championInfo.title}
                  </h4>
                </div>
              </div>
              {/* {createChampionLoreElement()} */}
              {createLevelSelectElement()}
              Current Level: {championLevel + 1}
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
          </div>
        ) : (
          <></>
        )}
      </div>
    </main>
  )
}
