type SearchContainerProps = {
	search: string
	setSearch: (search: string) => void
}

export function SearchContainer(props: SearchContainerProps) {
	const { search, setSearch } = props

	return (
		<div className="champions-page__search-container search-container">
			<input
				className="search-container__input"
				placeholder="Search a champion"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				autoFocus
			></input>
		</div>
	)
}
