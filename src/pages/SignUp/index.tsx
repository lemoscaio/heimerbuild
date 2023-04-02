import axios from "axios"
import { ChangeEvent, FormEvent, useState } from "react"
import {
	BsCheckCircleFill,
	BsFillExclamationTriangleFill,
} from "react-icons/bs"
import { Link, useNavigate } from "react-router-dom"

import Logo from "../../assets/images/heimerdinger.png"
import { AppName } from "../../components/AppName/"

type FeedbackMessageType = {
	status?: number
	message?: string
}

export function SignUp() {
	const navigate = useNavigate()
	const { VITE_APP_API_URL } = import.meta.env

	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [passwordConfirmation, setPasswordConfirmation] = useState("")

	const [trackingPassword, setTrackingPassword] = useState(false)
	const [matchingPassword, setMatchingPassword] = useState(false)

	const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessageType>(
		{}
	)

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const promise = axios.post(`${VITE_APP_API_URL}/sign-up`, {
			email,
			password,
		})
		promise.then((response) => {
			console.log(response)

			setFeedbackMessage({ status: response.status })
			setTimeout(() => {
				navigate("/sign-in")
			}, 1000)
		})
		promise.catch((error) => {
			console.log(error)

			setFeedbackMessage({ status: error.status, message: error.message })
		})
	}

	function startTrackingPassword(event: ChangeEvent<HTMLInputElement>) {
		if (event.target.name === "password") {
			setPassword(event.target.value)
			if (event.target.value === passwordConfirmation) setMatchingPassword(true)
			else setMatchingPassword(false)
		}
		if (event.target.name === "password-confirmation") {
			setPasswordConfirmation(event.target.value)
			event.target.value.length > 0
				? setTrackingPassword(true)
				: setTrackingPassword(false)
			if (event.target.value === password) setMatchingPassword(true)
			else setMatchingPassword(false)
		}
	}

	function isPasswordMatching() {
		if (trackingPassword && matchingPassword) {
			return (
				<p className="form__feedback-message form__feedback-message--password-match">
					<BsCheckCircleFill /> The passwords match!
				</p>
			)
		} else if (trackingPassword && !matchingPassword) {
			return (
				<p className="form__feedback-message form__feedback-message--password-match">
					<BsFillExclamationTriangleFill /> Both password fields must match!
				</p>
			)
		} else {
			return <></>
		}
	}

	function setButtonDisabled() {
		return !email || !matchingPassword ? true : false
	}

	function setErrorContainerContent() {
		let errorMessage = ""

		switch (feedbackMessage.status) {
			case 0:
				errorMessage = "Connection error. Please, try again later."
				break
			case 401:
				errorMessage = "E-mail or password incorrect!"
				break
			case 409:
				errorMessage = "E-mail already registered!."
				break
			case 422:
				errorMessage =
					"Both e-mail and password need to be filled in correctly."
				break
			case 500:
				errorMessage = "Something went wrong. Please try again later."
				break
			default:
				break
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

		switch (feedbackMessage.status) {
			case 200:
			case 201:
				successMessage = "Success! You'll be redirected to login page now."
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
						autoComplete="off"
						pattern="^\S{6,20}$"
						title="Your password must be at least 6 characters long and it may contain especial characters"
						onChange={(e) => startTrackingPassword(e)}
					></input>
					<input
						className="form__input"
						required
						type="password"
						name="password-confirmation"
						placeholder="Confirm password"
						autoComplete="off"
						onChange={(e) => startTrackingPassword(e)}
					></input>
					{isPasswordMatching()}
					{setErrorContainerContent()}
					{setSuccessContainerContent()}
					<button
						className="form__submit-button"
						disabled={setButtonDisabled()}
						type="submit"
					>
						Sign Up
					</button>
					<Link to="/sign-in" className="auth-page__link">
						Already registered? Sign in to your account.
					</Link>
				</form>
			</main>
		</div>
	)
}
