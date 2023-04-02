import { FaUser } from "react-icons/fa"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"

import heimerLogo from "../../assets/images/heimerdinger.png"

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const { user, logout } = useAuth()

  function handleGoToLoginClick() {
    navigate("/sign-in", { state: { previousPath: location.pathname } })
  }

  function handleUserClick() {
    navigate("/user", { state: { previousPath: location.pathname } })
  }

  function handleLogoutClick() {
    logout()
  }

  return (
    <header className="header">
      <div className="header__link">
        <Link to={"/"}>Back</Link>
      </div>
      <div className="header__logo-container">
        <Link to={"/"}>
          <img className="header__logo" src={heimerLogo} alt="" />
        </Link>
      </div>
      <div>
        {!user && (
          <p
            className="header__link champions-page__header-link"
            onClick={handleGoToLoginClick}
          >
            Login
          </p>
        )}
        {user && location.pathname !== "/user" && (
          <>
            <p
              className="champions-page__header-link"
              onClick={handleUserClick}
            >
              <FaUser className="champions-page__header-user-icon" />
            </p>
          </>
        )}
        {user && location.pathname === "/user" && (
          <>
            <p
              className="champions-page__header-link"
              onClick={handleLogoutClick}
            >
              Logout
            </p>
          </>
        )}
      </div>
    </header>
  )
}
