import { BrowserRouter } from "react-router-dom"

import { AuthProvider } from "../hooks/useAuth"
import Router from "../routes/routes.jsx"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </BrowserRouter>
  )
}
