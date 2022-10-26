import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import {
  BsCheckCircleFill,
  BsFillExclamationTriangleFill,
} from "react-icons/bs"

import Logo from "../assets/images/heimerdinger.png"
import AppName from "../components/AppName"
import { useAuth } from "../hooks/useAuth"

export default function SignUpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  console.log(
    `🚀 -> file: SignInPage.jsx -> line 15 -> SignUpPage -> location`,
    location,
  )

  const { VITE_APP_API_URL } = import.meta.env

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [requestMessage, setRequestMessage] = useState({})

  function handleSubmit(e) {
    e.preventDefault()

    const promise = axios.post(`${VITE_APP_API_URL}/sign-in`, {
      email,
      password,
    })

    promise.then((response) => {
      setRequestMessage(response)

      const redirectPath = location.state?.previousPath || "/"

      setTimeout(() => {
        login({ path: redirectPath, data: response.data })
        navigate(redirectPath)
      }, 1000)
    })

    promise.catch((error) => {
      setRequestMessage(error)
    })
  }

  function setErrorContainerContent() {
    let errorMessage = ""

    switch (requestMessage.response?.status) {
      case 0:
        errorMessage = "Connection error. Please, try again later."
        break
      case 401:
        errorMessage = "E-mail or password incorrect!"
        break
      case 422:
        errorMessage = "Both e-mail and password need to be filled in."
        break
      case 500:
        errorMessage = "Something went wrong. Please try again later."
        break
      default:
    }

    return errorMessage.length > 0 ? (
      <p className="form__feedback-message form__feedback-message--error">
        <BsFillExclamationTriangleFill /> {errorMessage}
      </p>
    ) : (
      <></>
    )
  }

  function setSuccessContainerContent() {
    let successMessage = ""

    switch (requestMessage?.status) {
      case 200:
      case 201:
        successMessage = "Success! You'll be redirected back to the store now."
        break
      default:
        break
    }

    return successMessage.length > 0 ? (
      <p className="form__feedback-message form__feedback-message--success">
        <BsCheckCircleFill /> {successMessage}
      </p>
    ) : (
      <></>
    )
  }

  return (
    <div className="page-container page-container--auth-page">
      <main className="auth-page">
        <button className="auth-page__back-button button">
          <Link to="/" className="auth-page__link">
            Back
          </Link>
        </button>
        <div className="auth-page__header">
          <img
            className="auth-page__header-image"
            src={Logo}
            alt={"Heimerbuild"}
          ></img>
          <AppName />
        </div>

        <form className="auth-page__form form" onSubmit={handleSubmit}>
          <input
            className="form__input"
            required
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          ></input>
          <input
            className="form__input"
            required
            type="password"
            name="password"
            placeholder="Password"
            autoComplete
            pattern="^\S{6,20}$"
            title="Your password must be at least 6 characters long and it may contain especial characters"
            onChange={(e) => setPassword(e.target.value)}
          ></input>
          {setErrorContainerContent()}
          {setSuccessContainerContent()}
          <button className="form__submit-button" type="submit">
            Sign In
          </button>
          <Link to="/sign-up" className="auth-page__link">
            Not yet registered? Create a new account.
          </Link>
        </form>
      </main>
    </div>
  )
}
