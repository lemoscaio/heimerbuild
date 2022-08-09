import React from "react"

export default function SearchContainer(props) {
  const { search, setSearch } = props

  return (
    <div className="champions-page__search-container search-container">
      <input
        className="search-container__input"
        placeholder="Search a champion"
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      ></input>
    </div>
  )
}
