import { FormEvent, useState } from "react"
import {
	BsCheckCircleFill,
	BsFillExclamationTriangleFill,
} from "react-icons/bs"
import { Link, useNavigate } from "react-router-dom"

import Logo from "../../assets/images/heimerdinger.png"
import { AppName } from "../../components/AppName/"
import { usePostUserSignUp } from "../../hooks/api/usePostUserSignUp"

const errorMessages: { [key: number]: string } = {
	0: "Connection error. Please, try again later.",
	409: "E-mail already registered!.",
	422: "Both e-mail and password need to be filled in correctly.",
	500: "Something went wrong. Please try again later.",
}

export function SignUp() {
	const navigate = useNavigate()

	const [email, setEmail] = useState("")

	const [password, setPassword] = useState("")
	const [passwordConfirmation, setPasswordConfirmation] = useState("")
	const passwordTracking = passwordConfirmation.length > 0
	const passwordsMatch = password === passwordConfirmation

	const signUpMutation = usePostUserSignUp()

	const errorStatusCode = signUpMutation.error?.response?.status
	const shouldShowError = errorStatusCode || errorStatusCode === 0

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		try {
			await signUpMutation.mutateAsync({ email, password })

			setTimeout(() => {
				navigate("/sign-in")
			}, 1000)
		} catch (error) {}
	}

	function isButtonDisabled() {
		if (!email || password.length === 0 || passwordConfirmation.length === 0)
			return true
		if (!passwordsMatch) return true
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
						onChange={(e) => setPassword(e.target.value)}
					></input>
					<input
						className="form__input"
						required
						type="password"
						name="password-confirmation"
						placeholder="Confirm password"
						autoComplete="off"
						onChange={(e) => setPasswordConfirmation(e.target.value)}
					></input>

					{passwordTracking &&
						(passwordsMatch ? (
							<p className="form__feedback-message form__feedback-message--password-match">
								<BsCheckCircleFill /> The entered passwords match!
							</p>
						) : (
							<p className="form__feedback-message form__feedback-message--password-match">
								<BsFillExclamationTriangleFill /> Both password fields must
								match!
							</p>
						))}

					{shouldShowError && (
						<p className="form__feedback-message form__feedback-message--error">
							<BsFillExclamationTriangleFill />{" "}
							{errorMessages[errorStatusCode] || errorMessages[500]}
						</p>
					)}
					{signUpMutation.isSuccess && (
						<p className="form__feedback-message form__feedback-message--success">
							<BsCheckCircleFill />
							Success! You'll be redirected to login page now.
						</p>
					)}
					<button
						className="form__submit-button"
						disabled={isButtonDisabled()}
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
