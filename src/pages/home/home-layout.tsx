import { AppName } from "@/components/common/app-name"
import { MainPageLogo } from "@/components/common/main-page-logo"

/** Brand, mascot and the page content, in one centred column. */
export function HomeLayout({ children }: React.PropsWithChildren) {
	return (
		<main className="mx-auto flex w-full max-w-360 flex-1 flex-col items-center gap-5 px-4 py-6 sm:gap-7 sm:px-8 lg:px-24 lg:py-12">
			<AppName />
			<MainPageLogo />
			{children}
		</main>
	)
}
