import React from "react"
import ReactDOM from "react-dom/client"

import { App } from "@/app/app"
import { initPostHog } from "@/app/posthog"
import { initSentry } from "@/app/sentry"
import "./styles/app.css"

initSentry()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)

initPostHog()

// TEMP diagnostic, revert before merge.
declare const __HB_BUILD_ENV_KEYS__: string
;(window as unknown as Record<string, string>).__HB_BUILD_ENV_KEYS__ =
	__HB_BUILD_ENV_KEYS__
