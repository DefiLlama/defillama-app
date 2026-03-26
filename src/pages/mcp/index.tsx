import Head from 'next/head'
import { BasicLink } from '~/components/Link'
import { LinkPreviewCard } from '~/components/SEO'
import MCPContainer from '~/containers/MCP'

export default function MCP() {
	return (
		<>
			<Head>
				<title>DefiLlama MCP: DeFi Data for AI Agents</title>
				<meta
					name="description"
					content="Connect Claude, Cursor, and other AI agents to DefiLlama's DeFi analytics. 23 tools for TVL, token prices, yields, protocol metrics, and more."
				/>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>
			<LinkPreviewCard />
			<div className="col-span-full flex min-h-screen w-full flex-col bg-(--app-bg) font-inter text-(--text-primary)">
				<header className="sticky top-0 z-50 border-b border-(--cards-border) bg-(--app-bg)/80 backdrop-blur-md">
					<div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4 sm:px-6 md:px-8">
						<BasicLink href="/" className="flex items-center gap-2.5">
							<img src="/assets/llama.webp" alt="DefiLlama" width={28} height={28} className="rounded-full" />
							<span className="text-sm font-bold tracking-tight">DefiLlama</span>
						</BasicLink>

						<nav className="flex items-center gap-1">
							<BasicLink
								href="#tools"
								className="rounded-md px-3 py-1.5 text-[13px] font-medium text-(--text-secondary) transition-colors hover:bg-(--btn-hover-bg) hover:text-(--text-primary)"
							>
								Tools
							</BasicLink>
							<BasicLink
								href="#setup"
								className="rounded-md px-3 py-1.5 text-[13px] font-medium text-(--text-secondary) transition-colors hover:bg-(--btn-hover-bg) hover:text-(--text-primary)"
							>
								Setup
							</BasicLink>
							<BasicLink
								href="/"
								className="rounded-md px-3 py-1.5 text-[13px] font-medium text-(--text-secondary) transition-colors hover:bg-(--btn-hover-bg) hover:text-(--text-primary)"
							>
								Back to Main
							</BasicLink>
						</nav>
					</div>
				</header>

				<main className="grow">
					<MCPContainer />
				</main>

				<footer className="border-t border-(--cards-border)">
					<p className="mx-auto max-w-[1100px] px-4 pt-6 text-center text-[13px] text-(--text-tertiary) sm:px-6 md:px-8">
						Questions or feedback?{' '}
						<a
							href="mailto:support@defillama.com"
							className="text-(--text-secondary) underline transition-colors hover:text-(--text-primary)"
						>
							support@defillama.com
						</a>
					</p>
					<div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-4 px-4 py-6 text-[13px] text-(--text-tertiary) sm:px-6 md:justify-between md:px-8">
						<span>&copy; {new Date().getFullYear()} DefiLlama</span>
						<div className="flex gap-5">
							<BasicLink href="/privacy-policy" className="transition-colors hover:text-(--text-secondary)">
								Privacy Policy
							</BasicLink>
							<BasicLink href="/terms" className="transition-colors hover:text-(--text-secondary)">
								Terms of Service
							</BasicLink>
						</div>
					</div>
				</footer>
			</div>
		</>
	)
}
