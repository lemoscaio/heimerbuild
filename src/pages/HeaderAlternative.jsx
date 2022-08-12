import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { FaUser } from "react-icons/fa"

export default function HeaderAlternative() {
  const navigate = useNavigate()
  const location = useLocation()

  const { user, logout } = useAuth()
  console.log(
    `🚀 -> file: HeaderAlternative.jsx -> line 10 -> HeaderAlternative -> user`,
    user,
  )

  function handleGoToLoginClick() {
    navigate("/sign-in", { state: { previousPath: location.pathname } })
  }

  function handleUserClick() {
    navigate("/user", { state: { previousPath: location.pathname } })
  }

  return (
    <header className="champions-page__header">
      <nav>
        {!user ? (
          <p
            className="champions-page__header-link"
            onClick={handleGoToLoginClick}
          >
            Login
          </p>
        ) : (
          <p className="champions-page__header-link" onClick={handleUserClick}>
            <FaUser className="champions-page__header-user-icon" />
          </p>
        )}
      </nav>
    </header>
  )
}
