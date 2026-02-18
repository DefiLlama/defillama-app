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
					<div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6 md:px-8">
						<BasicLink href="/" className="flex items-center gap-2.5">
							<img src="/assets/llama.webp" alt="DefiLlama" width={32} height={32} className="rounded-full" />
							<span className="text-[15px] font-bold tracking-[-0.02em]">DefiLlama</span>
						</BasicLink>

						<nav className="flex items-center gap-1.5">
							<BasicLink
								href="https://docs.llama.fi/spreadsheet-functions/function-reference"
								className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-[#b4b7bc] transition-colors hover:bg-[#222429] hover:text-white"
							>
								Functions Reference
							</BasicLink>
							<BasicLink
								href="https://docs.llama.fi/spreadsheet-functions/templates"
								className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-[#b4b7bc] transition-colors hover:bg-[#222429] hover:text-white"
							>
								Templates
							</BasicLink>
							<BasicLink
								href="/"
								className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-[#b4b7bc] transition-colors hover:bg-[#222429] hover:text-white"
							>
								Return to Main Page
							</BasicLink>
						</nav>
					</div>
				</header>

				<main className="grow">
					<SheetsContainer />
				</main>

				<footer className="mt-10 border-t border-[#39393E]/40">
					<p className="mx-auto max-w-[1200px] px-4 pt-6 text-center text-[13px] text-[#8a8c90] sm:px-6 md:px-8">
						If you have any questions or feedback, send it to{' '}
						<a href="mailto:support@defillama.com" className="text-[#b4b7bc] underline transition-colors hover:text-white">
							support@defillama.com
						</a>
					</p>
					<div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-4 px-4 py-6 text-[13px] text-[#8a8c90] sm:px-6 md:justify-between md:px-8">
						<span>&copy; {new Date().getFullYear()} DefiLlama</span>
						<div className="flex gap-5">
							<BasicLink href="/privacy-policy" className="transition-colors hover:text-[#b4b7bc]">
								Privacy Policy
							</BasicLink>
							<BasicLink href="/terms" className="transition-colors hover:text-[#b4b7bc]">
								Terms of Service
							</BasicLink>
						</div>
					</div>
				</footer>
			</div>
		</>
	)
}
