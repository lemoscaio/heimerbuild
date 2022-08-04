import { BrowserRouter, Routes, Route } from "react-router-dom"

import MainPage from "../pages/MainPage.jsx"
import ChampionPage from "../pages/ChampionPage.jsx"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/champions/:championKey" element={<ChampionPage />} />
      </Routes>
    </BrowserRouter>
  )
}
