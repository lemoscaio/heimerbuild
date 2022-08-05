import { BrowserRouter, Routes, Route } from "react-router-dom"

import ChampionsPage from "../pages/ChampionsPage.jsx"
import ChampionPage from "../pages/ChampionPage.jsx"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChampionsPage />} />
        <Route path="/champions/:championKey" element={<ChampionPage />} />
      </Routes>
    </BrowserRouter>
  )
}
