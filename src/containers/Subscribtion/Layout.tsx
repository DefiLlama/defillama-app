import Head from 'next/head'
import { BasicLink } from '~/components/Link'
import { SEO } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SignIn } from './SignIn'

export function SubscribeLayout({ children }) {
	const { isAuthenticated, logout } = useAuthContext()

	return (
		<>
			<Head>
				<title>Subscribe - DefiLlama</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<SEO />
			<div className="col-span-full flex min-h-screen w-full flex-col bg-[#13141a] text-white">
				<header className="sticky top-0 z-50 border-b border-[#39393E]/40 bg-[#13141a]/80 backdrop-blur-md">
					<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 xl:max-w-7xl 2xl:max-w-[1440px]">
						<BasicLink href="/" className="flex items-center gap-3">
							<img src="/icons/llama.webp" alt="DefiLlama" width={32} height={32} className="rounded-full" />
							<span className="hidden text-lg font-bold sm:inline-block">DefiLlama</span>
						</BasicLink>

						<div className="flex items-center gap-4">
							{!isAuthenticated ? (
								<SignIn className="flex items-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2 font-medium text-white shadow-md transition-all duration-200 hover:bg-[#4A4AF0]" />
							) : (
								<BasicLink href="/" className="text-sm font-medium text-[#b4b7bc] transition-colors hover:text-white">
									Return to Main Page
								</BasicLink>
							)}
							{isAuthenticated && (
								<button
									onClick={logout}
									className="rounded-lg border border-[#5C5CF9] bg-[#5C5CF9] px-4 py-2 font-medium text-white hover:bg-[#4A4AF0] dark:border-[#5C5CF9] dark:bg-[#5C5CF9] dark:hover:bg-[#4A4AF0]"
								>
									Logout
								</button>
							)}
						</div>
					</div>
				</header>

				<main className="grow py-8">{children}</main>

				<footer className="mt-auto border-t border-[#39393E]/40 px-5 py-8">
					<div className="mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px]">
						<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
							<div className="flex items-center gap-3">
								<img src="/icons/llama.webp" alt="DefiLlama" width={28} height={28} className="rounded-full" />
								<span className="font-bold">DefiLlama</span>
							</div>

							<div className="flex flex-wrap items-center justify-center gap-6 text-[#8a8c90]">
								<a href="https://discord.defillama.com" className="transition-colors hover:text-white">
									Discord
								</a>
								<a href="https://twitter.com/DefiLlama" className="transition-colors hover:text-white">
									Twitter
								</a>
								<a href="https://github.com/DefiLlama" className="transition-colors hover:text-white">
									GitHub
								</a>
								<a href="mailto:support@defillama.com" className="transition-colors hover:text-white">
									Contact Us
								</a>
							</div>
						</div>

						<div className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-[#39393E]/40 pt-6 text-xs text-[#8a8c90] md:justify-between">
							<div>© {new Date().getFullYear()} DefiLlama. All rights reserved.</div>
							<div className="flex flex-wrap items-center gap-4">
								<BasicLink href="/subscription/privacy-policy" className="transition-colors hover:text-white">
									Privacy Policy
								</BasicLink>

								<BasicLink href="/subscription/fulfillment-policies" className="transition-colors hover:text-white">
									Fulfillment Policies
								</BasicLink>

								<BasicLink href="/terms" className="transition-colors hover:text-white">
									Terms of Service
								</BasicLink>
							</div>
						</div>
					</div>
				</footer>
				<Toast />
			</div>
		</>
	)
}
