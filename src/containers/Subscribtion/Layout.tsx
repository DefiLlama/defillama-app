import { useState } from 'react'
import Head from 'next/head'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LinkPreviewCard } from '~/components/SEO'
import { Toast } from '~/components/Toast'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SignInModal } from './SignIn'

export function SubscribeLayout({ children }) {
	const { isAuthenticated, logout } = useAuthContext()
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	return (
		<>
			<Head>
				<title>Subscribe - DefiLlama</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<LinkPreviewCard />
			<div className="col-span-full flex min-h-screen w-full flex-col bg-[#13141a] text-white">
				<header className="sticky top-0 z-50 h-12 bg-transparent">
					<div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 xl:max-w-7xl 2xl:max-w-[1440px]">
						<div className="flex items-center gap-3">
							<BasicLink href="/" className="flex items-center gap-2 text-[#b4b7bc] transition-colors hover:text-white">
								<Icon name="chevron-left" height={20} width={20} />
								<span className="hidden sm:inline-block">Back</span>
							</BasicLink>
						</div>

						<div className="flex items-center gap-2">
							{!isAuthenticated ? (
								<SignInModal
									className="rounded-lg bg-[#5C5CF9] px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#4A4AF0]"
									hideLoader
								/>
							) : (
								<Ariakit.MenuProvider open={isMenuOpen} setOpen={setIsMenuOpen}>
									<Ariakit.MenuButton className="flex h-8 w-8 items-center justify-center rounded-lg text-[#b4b7bc] transition-colors hover:bg-[#2a2b30] hover:text-white">
										<Icon name="menu" height={18} width={18} />
									</Ariakit.MenuButton>
									<Ariakit.Menu
										className="z-50 min-w-[180px] rounded-lg border border-[#39393E] bg-[#1a1b1f] py-2 shadow-xl backdrop-blur-md"
										gutter={8}
									>
										<Ariakit.MenuItem
											className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#2a2b30] focus:bg-[#2a2b30] focus:outline-hidden"
											render={<BasicLink href="/" />}
										>
											<Icon name="arrow-left" height={14} width={14} className="text-[#8a8c90]" />
											Return to Main Page
										</Ariakit.MenuItem>
										<div className="my-1 h-px bg-[#39393E]" />
										<Ariakit.MenuItem
											className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#2a2b30] focus:bg-[#2a2b30] focus:outline-hidden"
											onClick={logout}
										>
											<Icon name="x" height={14} width={14} className="text-red-400" />
											Logout
										</Ariakit.MenuItem>
									</Ariakit.Menu>
								</Ariakit.MenuProvider>
							)}
						</div>
					</div>
				</header>

				<main className="grid grow py-8">{children}</main>

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
								<BasicLink href="/privacy-policy" className="transition-colors hover:text-white">
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
