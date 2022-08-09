import ChampionCard from "./ChampionCard.jsx"

export default function ChampionList(props) {
  const { search, champions, filteredChampions } = props

  return champions ? (
    <>
      <div className="champions-list">
        {search.length === 0
          ? Object.keys(champions).map((championName) => {
              const champion = champions[championName]
              return (
                <ChampionCard
                  key={champion.id}
                  champion={champion}
                ></ChampionCard>
              )
            })
          : filteredChampions.map((championName) => {
              const champion = champions[championName]
              return (
                <ChampionCard
                  key={champion.id}
                  champion={champion}
                ></ChampionCard>
              )
            })}
      </div>
    </>
  ) : (
    <>Loading...</>
  )
}
