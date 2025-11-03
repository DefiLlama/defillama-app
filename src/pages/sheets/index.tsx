import Head from 'next/head'
import { BasicLink } from '~/components/Link'
import { LinkPreviewCard } from '~/components/SEO'
import SheetsContainer from '~/containers/Sheets'

export default function Sheets() {
	return (
		<>
			<Head>
				<title>DefiLlama Sheets</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<LinkPreviewCard />
			<div className="col-span-full flex min-h-screen w-full flex-col bg-[#13141a] text-white">
				<header className="sticky top-0 z-50 border-b border-[#39393E]/40 bg-[#13141a]/80 backdrop-blur-md">
					<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 xl:max-w-7xl 2xl:max-w-[1440px]">
						<BasicLink href="/" className="flex items-center gap-3">
							<img src="/icons/llama.webp" alt="DefiLlama" width={32} height={32} className="rounded-full" />
							<span className="hidden text-lg font-bold sm:inline-block">DefiLlama</span>
						</BasicLink>

						<div className="flex items-center gap-4">
							<BasicLink href="/" className="text-sm font-medium text-[#b4b7bc] transition-colors hover:text-white">
								Return to Main Page
							</BasicLink>
						</div>
					</div>
				</header>

				<main className="grow py-8">
					<SheetsContainer />
				</main>

				<footer className="mt-auto border-t border-[#39393E]/40 px-5 py-8">
					<div className="mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px]">
						<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#8a8c90] md:justify-between">
							<div>© {new Date().getFullYear()} DefiLlama. All rights reserved.</div>
							<div className="flex flex-wrap items-center gap-4">
								<BasicLink href="/privacy-policy" className="transition-colors hover:text-white">
									Privacy Policy
								</BasicLink>

								<BasicLink href="/terms" className="transition-colors hover:text-white">
									Terms of Service
								</BasicLink>
							</div>
						</div>
					</div>
				</footer>
			</div>
		</>
	)
}
