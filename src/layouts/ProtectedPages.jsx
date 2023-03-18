import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

export default function ProtectedPages() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to={"/"} />
  }

  return (
    <div className="height-container">
      <Outlet />
    </div>
  )
}
