import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import {
	BsCheckCircleFill,
	BsFillExclamationTriangleFill,
} from "react-icons/bs"

import Logo from "../../assets/images/heimerdinger.png"
import { FormEvent } from "react"
import { AppName } from "../../components/AppName"
import { useAuth } from "../../hooks/useAuth"
import { usePostUserSignIn } from "../../hooks/api/usePostUserSignIn"

const errorMessages: { [key: number]: string } = {
	0: "Connection error. Please, try again later.",
	200: "Success! You'll be redirected back to the store now.",
	201: "Success! You'll be redirected back to the store now.",
	401: "E-mail or password incorrect!",
	422: "Both e-mail and password need to be filled in.",
	500: "Something went wrong. Please try again later.",
}

export function SignIn() {
	const navigate = useNavigate()
	const location = useLocation()
	const { login } = useAuth()

	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")

	const signInMutation = usePostUserSignIn()

	const errorStatusCode = signInMutation.error?.response?.status
	const shouldShowError = errorStatusCode || errorStatusCode === 0
	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault()

		try {
			const response = await signInMutation.mutateAsync({ email, password })

			const redirectPath = location.state?.previousPath || "/"

			setTimeout(() => {
				login({ path: redirectPath, data: response.data })
				navigate(redirectPath)
			}, 1000)
		} catch (error) {}
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
						autoComplete="current-password"
						pattern="^\S{6,20}$"
						title="Your password must be at least 6 characters long and it may contain especial characters"
						onChange={(e) => setPassword(e.target.value)}
					></input>
					{shouldShowError && (
						<p className="form__feedback-message form__feedback-message--error">
							<BsFillExclamationTriangleFill />
							{errorMessages[errorStatusCode] || errorMessages[500]}
						</p>
					)}
					{signInMutation.isSuccess && (
						<p className="form__feedback-message form__feedback-message--success">
							<BsCheckCircleFill />
							Success! You'll be redirected back to the site now.
						</p>
					)}
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
