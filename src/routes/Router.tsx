import { Navigate, Route, Routes } from "react-router-dom"

import PageWithHeader from "../layouts/PageWithHeader"
import AuthPages from "../layouts/AuthPages"
import ProtectedPages from "../layouts/ProtectedPages"

import ChampionPage from "../pages/ChampionPage"
import ChampionsPage from "../pages/ChampionsPage"
import SignUpPage from "../pages/SignUpPage"
import SignInPage from "../pages/SignInPage"
import UserPage from "../pages/UserPage"
import { ItemsProvider } from "../contexts/ItemsContext"
import { ChampionsProvider } from "../contexts/ChampionsContext"
import { LoadingProvider } from "../contexts/loadingContext"

export default function Router() {
  return (
    <LoadingProvider>
      <ChampionsProvider>
        <ItemsProvider>
          <Routes>
            <Route element={<AuthPages />}>
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/sign-in" element={<SignInPage />} />
            </Route>
            <Route element={<ProtectedPages />}>
              <Route element={<PageWithHeader />}>
                <Route path="/user" element={<UserPage />} />
              </Route>
            </Route>
            <Route path="/champions" element={<ChampionsPage />} />
            <Route element={<PageWithHeader />}>
              <Route
                path="/champions/:championKey"
                element={<ChampionPage />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/champions" replace />} />
          </Routes>
        </ItemsProvider>
      </ChampionsProvider>
    </LoadingProvider>
  )
}
