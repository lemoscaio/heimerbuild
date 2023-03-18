import { useNavigate } from "react-router-dom"

export default function ChampionCard(props) {
  const navigate = useNavigate()

  function handleClick(e, championName) {
    navigate(`/champions/${championName}`)
  }

  return (
    <article
      className="champion-card"
      onClick={(e) => handleClick(e, props.champion.key)}
    >
      <img
        src={`${props.champion.icon}`}
        alt=""
        className="champion-card__image"
      />
      <h3 className="champion-card__name">{props.champion.name}</h3>
    </article>
  )
}
