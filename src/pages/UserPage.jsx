import axios from "axios"
import { useContext, useState } from "react"

import itemStatsIcons from "../assets/stats-icons"
import { championsContext } from "../contexts/championsContext"
import { itemsContext } from "../contexts/itemsContext"
import { useAuth } from "../hooks/useAuth"
import goldIcon from "./../assets/stats-icons/Gold_icon.png"

import { MdDeleteForever } from "react-icons/md"

export default function UserPage() {
  // const example = {
  //   name: "Quinn",
  //   key: "Quinn",
  //   level: 18,
  //   cost: 14500,
  //   items: ["1001", "1004", "1006", "3001", "3004"],
  //   stats: {
  //     attackDamage: 350,
  //     abilityPower: 350,
  //     armor: 350,
  //     magicResistance: 350,
  //     attackSpeed: 350,
  //     abilityHaste: 350,
  //     criticalStrike: 350,
  //     movespeed: 350,
  //     health: 350,
  //     healthRegen: 350,
  //     mana: 350,
  //     manaRegen: 350,
  //     lethality: 350,
  //     armorPenetration: 350,
  //     flatMagicPenetration: 100,
  //     percentageMagicPenetration: 35,
  //     lifeSteal: 350,
  //     physicalVamp: 350,
  //     omniVamp: 350,
  //     attackRange: 350,
  //     tenacity: 350,
  //   },
  // }
  // const builds = [example, example, example, example, example]

  const { VITE_APP_API_URL } = import.meta.env
  const { user } = useAuth()
  const [builds, setBuilds] = useState(() => {
    axios
      .get(`${VITE_APP_API_URL}/builds`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((response) => {
        const builds = response.data
        setBuilds(builds)
        console.log(builds)
      })
      .catch((error) => {
        console.log(error)
      })
  })

  const { items } = useContext(itemsContext)
  const { champions } = useContext(championsContext)

  function handleDeleteBuildClick(buildId) {
    console.log("Cliquei")
    console.log(buildId)

    axios
      .delete(`${VITE_APP_API_URL}/builds/delete/${buildId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((response) => {
        const updatedBuilds = builds.filter((build) => build.id !== buildId)

        setBuilds([...updatedBuilds])
      })
      .catch((error) => {
        console.log(error)
      })
  }

  function createChosenItemsElement(build) {
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
          </div>,
        )
      } else {
        itemElements.push(<div className="build-card__chosen-item"></div>)
      }
    }

    return itemElements
  }

  function createStatsElement(build) {
    return (
      <>
        <div className="build-card__stats-group">
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
        </div>
        <div className="build-card__stats-group">
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
              console.log(
                `🚀 -> file: UserPage.jsx -> line 286 -> builds.map -> build`,
                build,
              )
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
                      <div className="build-card__champion">
                        {champions && (
                          <img
                            src={champions[build.championKey].icon}
                            alt={champions[build.championKey].name}
                            className="build-card__champion-image"
                          />
                        )}
                        <h2 className="build-card__champion-name">
                          {build.name}
                        </h2>
                        <h3 className="build-card__champion-level">
                          Level: {build.level}
                        </h3>
                      </div>
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
