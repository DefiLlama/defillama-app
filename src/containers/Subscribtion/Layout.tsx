import { SEO } from '~/components/SEO'
import { SignIn } from './SignIn'
import Head from 'next/head'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { Toast } from '~/components/Toast'
import { BasicLink } from '~/components/Link'

export function SubscribeLayout({ children }) {
	const { isAuthenticated, logout } = useAuthContext()

	return (
		<>
			<Head>
				<title>Subscribe - DefiLlama</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<SEO />
			<div className="col-span-full w-full flex flex-col min-h-screen bg-[#13141a] text-white">
				<header className="sticky top-0 z-50 backdrop-blur-md border-b border-[#39393E]/40 bg-[#13141a]/80">
					<div className="max-w-6xl xl:max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
						<BasicLink href="/" className="flex items-center gap-3">
							<img src="/llama.png" alt="DefiLlama" width={32} height={32} className="rounded-full" />
							<span className="font-bold text-lg hidden sm:inline-block">DefiLlama</span>
						</BasicLink>

						<div className="flex items-center gap-4">
							{!isAuthenticated ? (
								<SignIn className="font-medium rounded-lg bg-[#5C5CF9] hover:bg-[#4A4AF0] text-white py-2 px-4 shadow-md transition-all duration-200 flex items-center gap-2" />
							) : (
								<BasicLink href="/" className="font-medium text-sm text-[#b4b7bc] hover:text-white transition-colors">
									Return to Main Page
								</BasicLink>
							)}
							{isAuthenticated && (
								<button
									onClick={logout}
									className="font-medium rounded-lg border border-[#5C5CF9] dark:border-[#5C5CF9] bg-[#5C5CF9] dark:bg-[#5C5CF9] hover:bg-[#4A4AF0] dark:hover:bg-[#4A4AF0] text-white py-2 px-4"
								>
									Logout
								</button>
							)}
						</div>
					</div>
				</header>

				<main className="flex-grow py-8">{children}</main>

				<footer className="border-t border-[#39393E]/40 mt-auto py-8 px-5">
					<div className="max-w-6xl xl:max-w-7xl mx-auto">
						<div className="flex flex-col md:flex-row items-center justify-between gap-6">
							<div className="flex items-center gap-3">
								<img src="/llama.png" alt="DefiLlama" width={28} height={28} className="rounded-full" />
								<span className="font-bold">DefiLlama</span>
							</div>

							<div className="flex flex-wrap items-center justify-center gap-6 text-[#8a8c90]">
								<a href="https://discord.defillama.com" className="hover:text-white transition-colors">
									Discord
								</a>
								<a href="https://twitter.com/DefiLlama" className="hover:text-white transition-colors">
									Twitter
								</a>
								<a href="https://github.com/DefiLlama" className="hover:text-white transition-colors">
									GitHub
								</a>
								<a href="mailto:support@defillama.com" className="hover:text-white transition-colors">
									Contact Us
								</a>
							</div>
						</div>

						<div className="mt-6 pt-6 border-t border-[#39393E]/40 flex flex-wrap items-center justify-center md:justify-between gap-4 text-xs text-[#8a8c90]">
							<div>© {new Date().getFullYear()} DefiLlama. All rights reserved.</div>
							<div className="flex flex-wrap items-center gap-4">
								<BasicLink href="/subscription/privacy-policy" className="hover:text-white transition-colors">
									Privacy Policy
								</BasicLink>

								<BasicLink href="/subscription/fulfillment-policies" className="hover:text-white transition-colors">
									Fulfillment Policies
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
