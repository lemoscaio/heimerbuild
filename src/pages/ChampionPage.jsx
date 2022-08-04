import { useState, useEffect, useCallback } from "preact/hooks"
import { useParams } from "react-router-dom"
import axios from "axios"

import { ChampionSkills } from "../components/ChampionSkills"

export default function ChampionPage() {
  const { championKey } = useParams()

  const MAX_LEVEL = 18

  const { VITE_APP_API_URL } = import.meta.env

  const [championInfo, setChampionInfo] = useState(() => {
    axios
      .get(`${VITE_APP_API_URL}/champions/${championKey}`)
      .then((response) => {
        const championData = response.data

        setChampionInfo(championData)
      })
      .catch((error) => console.log(error))
  })

  // const [championDisplayInfo, setChampionDisplayInfo] = useState({})

  const [championLevel, setChampionLevel] = useState(0)

  const [championStats, setChampionStats] = useState({})

  console.log({ championInfo })
  console.log({ championLevel: championLevel })
  console.log({ championStats })

  const updateEachStat = useCallback(
    (stats) => {
      const newStats = {}

      for (let stat in stats) {
        newStats[stat] = stats[stat].flat + championLevel * stats[stat].perLevel
      }

      return newStats
    },
    [championLevel],
  )

  useEffect(() => {
    if (championInfo) {
      setChampionStats(updateEachStat(championInfo.stats))
    }
  }, [championInfo, championLevel, updateEachStat])

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
    const statsElements = []

    for (let stat in championStats) {
      statsElements.push(
        <li>
          {" "}
          {stat}: {championStats[stat]}{" "}
        </li>,
      )
    }

    return (
      <div>
        {createLevelSelectElement()}
        Current Level: {championLevel + 1}
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
              <img
                style={{ objectFit: "cover" }}
                src={championInfo.icon}
                alt=""
                className="champion-info__image"
              />
              <div className="champion-info__info-container info-container">
                <h3 className="info-container__name">{championInfo.name}</h3>
                <h4 className="info-container__title">{championInfo.title}</h4>
                {createChampionLoreElement()}
              </div>
            </div>
            <div>
              {createChampionTypesElement()}
              {createAttackTypeElement()}
              {createChampionStatsElement()}
            </div>
            <div>
              <ChampionSkills
                abilities={championInfo.abilities}
              ></ChampionSkills>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    </main>
  )
}
