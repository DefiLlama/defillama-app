import { lazy, Suspense, useEffect, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SEO } from '~/components/SEO'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { cn } from '~/utils/cn'

const EXAMPLE_CONVERSATIONS = [
	{
		id: 'find-alpha',
		category: 'Find Alpha',
		prompt: 'Show me the top 5 protocols with growing TVL but declining token prices',
		description: 'Table + chart analysis identifying potential value opportunities and key insights',
		url: 'https://defillama.com/ai/chat/shared/34525e47-528e-4b20-8ab4-4d2dd5d31252',
		screenshot: '/assets/llamaai-3'
	},
	{
		id: 'research',
		category: 'Research',
		prompt: 'Provide an overview of the stablecoin sector with focus on CBDCs',
		description: 'In-depth research report covering market trends, legislation, and adoption',
		url: 'https://defillama.com/ai/chat/shared/9634371a-d385-4e28-bcd8-d758f0bbcd30',
		screenshot: '/assets/llamaai-1'
	},
	{
		id: 'speculative',
		category: 'Speculative',
		prompt: 'Price estimate for BTC using technicals, Monte Carlo, and prediction markets',
		description: 'Blended analysis with charts, simulation outcomes, and Polymarket probabilities',
		url: 'https://defillama.com/ai/chat/shared/b60a2440-445e-4755-b227-7127557a4d79',
		screenshot: '/assets/llamaai-2'
	}
] as const

const WHY_LLAMAAI_FEATURES = [
	{
		title: 'Faster Insights',
		description:
			"LlamaAI leverages DefiLlama's data to handle the heavy lifting of analysis so you can move from question to insight in a fraction of the time.",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
				<path
					d="M9 3H5C3.89543 3 3 3.89543 3 5V9C3 10.1046 3.89543 11 5 11H9C10.1046 11 11 10.1046 11 9V5C11 3.89543 10.1046 3 9 3Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M7 11V15C7 15.5304 7.21071 16.0391 7.58579 16.4142C7.96086 16.7893 8.46957 17 9 17H13"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M19 13H15C13.8954 13 13 13.8954 13 15V19C13 20.1046 13.8954 21 15 21H19C20.1046 21 21 20.1046 21 19V15C21 13.8954 20.1046 13 19 13Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		)
	},
	{
		title: 'Automatic Charts',
		description:
			'Generates the right chart for your query and pairs it with structured insights, visual context, and downloadable data.',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
				<path
					d="M3 3V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H21"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M7 11.2069C7.00003 11.0746 7.05253 10.9476 7.146 10.8539L9.146 8.85393C9.19245 8.80736 9.24762 8.77042 9.30837 8.74521C9.36911 8.72001 9.43423 8.70703 9.5 8.70703C9.56577 8.70703 9.63089 8.72001 9.69163 8.74521C9.75238 8.77042 9.80755 8.80736 9.854 8.85393L13.146 12.1459C13.1924 12.1925 13.2476 12.2294 13.3084 12.2546C13.3691 12.2798 13.4342 12.2928 13.5 12.2928C13.5658 12.2928 13.6309 12.2798 13.6916 12.2546C13.7524 12.2294 13.8076 12.1925 13.854 12.1459L18.146 7.85393C18.2159 7.78388 18.3049 7.73614 18.402 7.71674C18.499 7.69734 18.5996 7.70716 18.691 7.74495C18.7824 7.78274 18.8606 7.84681 18.9156 7.92905C18.9706 8.01128 19 8.10799 19 8.20692V15.9999C19 16.2651 18.8946 16.5195 18.7071 16.707C18.5196 16.8946 18.2652 16.9999 18 16.9999H8C7.73478 16.9999 7.48043 16.8946 7.29289 16.707C7.10536 16.5195 7 16.2651 7 15.9999V11.2069Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		)
	},
	{
		title: 'Connect the Dots',
		description:
			"Navigate DefiLlama's dataset with flexibility, combining metrics and surfacing insights not easily discoverable on dashboards.",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
				<path
					d="M22 17C22 17.5304 21.7893 18.0391 21.4142 18.4142C21.0391 18.7893 20.5304 19 20 19H6.828C6.29761 19.0001 5.78899 19.2109 5.414 19.586L3.212 21.788C3.1127 21.8873 2.9862 21.9549 2.84849 21.9823C2.71077 22.0097 2.56803 21.9956 2.43831 21.9419C2.30858 21.8881 2.1977 21.7971 2.11969 21.6804C2.04167 21.5637 2.00002 21.4264 2 21.286V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V17Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path d="M12 11H12.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M16 11H16.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M8 11H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		)
	}
] as const

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export default function LlamaAIGetStarted() {
	const subscribeModalStore = Ariakit.useDialogStore()
	const { isAuthenticated, hasActiveSubscription } = useAuthContext()
	const [mounted, setMounted] = useState(false)
	const [isVideoPlaying, setIsVideoPlaying] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const CTAButton = ({ className = '', label = 'Try LlamaAI' }: { className?: string; label?: string }) =>
		isAuthenticated && hasActiveSubscription ? (
			<BasicLink
				href="/ai/chat"
				data-umami-event="llamaai-landing-cta-subscribed"
				className={cn(
					'llamaai-glow relative z-10 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-6 py-3 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0px_0px_40px_0px_rgba(253,224,169,0.7)]',
					className
				)}
			>
				<svg className="h-4 w-4 shrink-0">
					<use href="/icons/ask-llamaai-3.svg#ai-icon" />
				</svg>
				<span className="whitespace-nowrap">{label}</span>
			</BasicLink>
		) : (
			<button
				onClick={() => subscribeModalStore.show()}
				data-umami-event="llamaai-landing-cta-unsubscribed"
				className={cn(
					'llamaai-glow relative z-10 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-6 py-3 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0px_0px_40px_0px_rgba(253,224,169,0.7)]',
					className
				)}
			>
				<svg className="h-4 w-4 shrink-0">
					<use href="/icons/ask-llamaai-3.svg#ai-icon" />
				</svg>
				<span className="whitespace-nowrap">{label}</span>
			</button>
		)

	return (
		<>
			<SEO
				title="LlamaAI - DefiLlama"
				description="Ask questions, generate charts, and explore any DeFi metric instantly. LlamaAI brings the power of DefiLlama's comprehensive data to your fingertips through natural conversation."
				keywords="LlamaAI, DefiLlama AI, DeFi AI"
				canonicalUrl="https://defillama.com/ai"
			/>
			<div className="col-span-full flex min-h-screen flex-col overflow-x-hidden bg-[#FAFAFA] dark:bg-[#131416]">
				{/* Header */}
				<header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
					<BasicLink
						href="/"
						className="inline-block w-fit opacity-70 transition-opacity duration-300 hover:opacity-100"
					>
						<span className="sr-only">Navigate to Home Page</span>
						<img
							src="/icons/defillama.webp"
							height={36}
							width={105}
							className="hidden object-contain object-left dark:block"
							alt=""
							fetchPriority="high"
						/>
						<img
							src="/icons/defillama-dark.webp"
							height={36}
							width={105}
							className="object-contain object-left dark:hidden"
							alt=""
							fetchPriority="high"
						/>
					</BasicLink>
				</header>

				{/* Hero Section */}
				<section className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-12 pb-24 md:px-8 md:pt-16 md:pb-36">
					<div className="grid items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
						{/* Left: Text Content */}
						<div
							className={cn(
								'relative z-10 flex flex-col items-center text-center md:items-start md:text-left',
								'transition-all duration-700',
								mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
							)}
						>
							{/* Llama Icon */}
							<div className="relative mb-8">
								{/* Outer glow */}
								<span
									className="absolute inset-0 -m-8 block rounded-full"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 65%)',
										filter: 'blur(30px)',
										opacity: 0.6
									}}
								/>
								{/* Inner glow */}
								<span
									className="absolute inset-0 -m-4 block rounded-full"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 60%)',
										filter: 'blur(15px)',
										opacity: 0.4
									}}
								/>
								<img
									src="/icons/llama-ai.svg"
									alt=""
									className="relative h-20 w-20 object-contain drop-shadow-[0_0_20px_rgba(253,224,169,0.4)] md:h-24 md:w-24"
								/>
							</div>
							<h1 className="mb-6 text-[3rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-black md:text-[4rem] lg:text-[4.5rem] dark:text-white">
								<span className="bg-gradient-to-r from-[#C99A4A] to-[#8B6914] bg-clip-text text-transparent dark:from-[#FDE0A9] dark:to-[#C99A4A]">
									LlamaAI
								</span>
							</h1>
							<p className="mb-8 max-w-lg text-lg leading-relaxed text-[#555] md:text-xl dark:text-[#a0a0a5]">
								AI-powered DeFi research: deep data, live insights, actionable analysis.
							</p>
							<div className="relative z-20">
								<CTAButton />
							</div>
						</div>

						{/* Right: Video Preview Card */}
						<div
							className={cn(
								'relative w-full',
								'transition-all delay-200 duration-700',
								mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
							)}
						>
							<div className="group relative overflow-hidden rounded-2xl border border-[#E8E8E8] shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:border-[#2a2a2e] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
								{/* Video content */}
								<div className="relative aspect-video w-full">
									{!isVideoPlaying ? (
										<button
											onClick={() => setIsVideoPlaying(true)}
											className="absolute inset-0 z-10 flex items-center justify-center"
											aria-label="Play demo video"
										>
											{/* Thumbnail */}
											<img
												src="https://img.youtube.com/vi/rEJz1gfC0Oc/maxresdefault.jpg"
												alt="LlamaAI Demo"
												className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
											/>
											{/* Overlay gradient */}
											<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 transition-opacity duration-300 group-hover:opacity-70" />
											{/* Play button */}
											<div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FDE0A9] to-[#C99A4A] shadow-[0_8px_32px_rgba(253,224,169,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_48px_rgba(253,224,169,0.6)] md:h-20 md:w-20">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="currentColor"
													className="ml-1 h-6 w-6 text-[#1a1a1a] md:h-8 md:w-8"
												>
													<path d="M8 5.14v14l11-7-11-7z" />
												</svg>
											</div>
											{/* Watch demo text */}
											<span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-all duration-300 group-hover:bg-black/80 md:bottom-6 md:px-4 md:py-2 md:text-sm">
												Watch demo
											</span>
										</button>
									) : (
										<iframe
											src="https://www.youtube.com/embed/rEJz1gfC0Oc?si=0DD5sxzyUpC7GO14&autoplay=1"
											title="LlamaAI Demo"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
											referrerPolicy="strict-origin-when-cross-origin"
											allowFullScreen
											className="absolute inset-0 h-full w-full"
										/>
									)}
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Subtle section divider */}
				<div className="relative z-10 mx-auto max-w-4xl px-4 md:px-8">
					<div className="h-px bg-gradient-to-r from-transparent via-[#E8E8E8] to-transparent dark:via-[#2a2a2e]" />
				</div>

				{/* Examples */}
				<section className="relative z-10 px-4 pt-20 pb-24 md:px-8 md:pt-28 md:pb-32">
					<div className="mx-auto max-w-6xl">
						<div className="mb-12 text-center md:mb-16">
							<h2 className="mb-4 text-[2rem] font-extrabold tracking-[-0.02em] text-black md:text-[2.75rem] dark:text-white">
								What can you do with LlamaAI?
							</h2>
							<p className="mx-auto max-w-lg text-lg text-[#666] dark:text-[#919296]">
								Click any card to explore actual LlamaAI conversations
							</p>
						</div>

						<div className="grid gap-5 md:grid-cols-3">
							{EXAMPLE_CONVERSATIONS.map((example, index) => (
								<div key={example.id} className={cn('flex flex-col', index === 1 && 'md:translate-y-8')}>
									{/* Category Header */}
									<h3 className="mb-3 text-sm font-bold tracking-wider text-[#C99A4A] uppercase md:text-base dark:text-[#FDE0A9]">
										{example.category}
									</h3>

									<a
										href={example.url}
										target="_blank"
										rel="noopener noreferrer"
										className={cn(
											'group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white transition-all duration-500',
											'hover:-translate-y-2 hover:border-[#C99A4A]/40 hover:shadow-[0_24px_64px_rgba(253,224,169,0.25)]',
											'dark:border-[#2a2a2e] dark:bg-[#1e1f23] dark:hover:border-[#FDE0A9]/30 dark:hover:shadow-[0_24px_64px_rgba(253,224,169,0.12)]'
										)}
									>
										<div className="relative aspect-[4/3] w-full overflow-hidden bg-[#131516]">
											<img
												src={`${example.screenshot}.png`}
												alt=""
												className="hidden h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-110 dark:block"
											/>
											<img
												src={`${example.screenshot}-light.png`}
												alt=""
												className="block h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-110 dark:hidden"
											/>
											<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-all duration-500 group-hover:opacity-100">
												<span className="flex translate-y-4 items-center gap-2 rounded-full bg-gradient-to-r from-[#FDE0A9] to-[#F5D08C] px-6 py-3 text-sm font-semibold text-[#5C4A1F] shadow-[0_8px_32px_rgba(253,224,169,0.5)] transition-all duration-500 group-hover:translate-y-0">
													View analysis
													<Icon name="arrow-up-right" height={16} width={16} />
												</span>
											</div>
										</div>

										<div className="flex flex-1 flex-col p-5">
											<p className="mb-3 line-clamp-2 text-base leading-snug font-semibold text-black dark:text-white">
												"{example.prompt}"
											</p>
											<p className="mt-auto text-sm leading-relaxed text-[#777] dark:text-[#888]">
												{example.description}
											</p>
										</div>
									</a>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Your Research Edge */}
				<section className="relative z-10 px-4 pb-20 md:px-8 md:pb-28">
					<div className="mx-auto max-w-5xl">
						<h2 className="mb-10 text-center text-[1.75rem] font-extrabold tracking-[-0.02em] text-black md:mb-12 md:text-[2rem] dark:text-white">
							Your research edge
						</h2>

						<div className="grid gap-6 md:grid-cols-3 md:gap-8">
							{WHY_LLAMAAI_FEATURES.map((feature) => (
								<div key={feature.title} className="flex items-start gap-3">
									<span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[#C99A4A] dark:text-[#FDE0A9]">
										{feature.icon}
									</span>
									<div>
										<p className="mb-1 font-semibold text-black dark:text-white">{feature.title}</p>
										<p className="text-[15px] leading-relaxed text-[#555] dark:text-[#a0a0a5]">{feature.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section className="relative z-10 px-4 pb-24 md:px-8 md:pb-32">
					<div className="mx-auto max-w-3xl">
						<h2 className="mb-8 text-center text-[1.75rem] font-extrabold tracking-[-0.02em] text-black md:mb-10 md:text-[2rem] dark:text-white">
							FAQs
						</h2>

						<div className="divide-y divide-[#E8E8E8] border-t border-[#E8E8E8] dark:divide-[#2a2a2e] dark:border-[#2a2a2e]">
							<FAQ question="What is LlamaAI?">
								<p>
									Your AI research assistant for DeFi. Ask questions in plain language and get ranked tables, custom
									charts, research reports, and analysis. LlamaAI combines DefiLlama's comprehensive dataset with
									real-time web search and market data.
								</p>
							</FAQ>
							<FAQ question="What can it do right now?">
								<ul className="flex list-disc flex-col gap-1.5 pl-4">
									<li>Analyze protocols with complex multi-factor queries</li>
									<li>Generate custom charts and export data as CSV</li>
									<li>Write in-depth research reports</li>
									<li>Provide speculative guidance using technical indicators</li>
								</ul>
							</FAQ>
							<FAQ question="Where does the data come from?">
								<p>DefiLlama's complete dataset enriched with real-time web search for the latest context.</p>
							</FAQ>
							<FAQ question="Who has access?">
								<p>
									LlamaAI is included in all paid subscriptions along with the DefiLlama Pro features. Free users can
									upgrade to use it.
								</p>
							</FAQ>
							<FAQ question="What sort of prompts can it answer?">
								<ul className="flex list-disc flex-col gap-1.5 pl-4">
									<li>"Which protocols have growing TVL but declining prices?"</li>
									<li>"Deep dive into Hyperliquid's competitive positioning"</li>
									<li>"Is ETH a good buy right now?"</li>
								</ul>
							</FAQ>
							<FAQ question="Can I export results?">
								<p>Yes. You can download returned tables and charts as CSVs.</p>
							</FAQ>
							<FAQ question="Is this investment advice?">
								<p>
									LlamaAI provides data and analysis to support your research, not replace it. Always verify and think
									critically.
								</p>
							</FAQ>
							<FAQ question="Need help?">
								<p>
									Contact{' '}
									<a
										href="mailto:support@defillama.com"
										className="text-[#C99A4A] underline decoration-[#C99A4A]/40 transition-colors hover:text-[#B8860B] dark:text-[#FDE0A9] dark:hover:text-[#FBEDCB]"
									>
										support@defillama.com
									</a>
								</p>
							</FAQ>
						</div>
					</div>
				</section>

				{/* Final CTA */}
				<section className="relative z-10 px-4 pb-16 md:px-8 md:pb-24">
					<div className="mx-auto max-w-3xl">
						<div className="relative overflow-hidden rounded-2xl border border-[#E8E8E8] bg-gradient-to-br from-white via-[#FEFDFB] to-[#FDF8EF] dark:border-[#2a2a2e] dark:from-[#1e1f23] dark:via-[#1e1f23] dark:to-[#252218]">
							<div className="pointer-events-none absolute inset-0 overflow-hidden">
								<div
									className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full opacity-30"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 70%)',
										filter: 'blur(40px)'
									}}
								/>
								<div
									className="absolute -top-8 -left-8 h-32 w-32 rounded-full opacity-20"
									style={{
										background: 'radial-gradient(circle, #FDE0A9 0%, transparent 70%)',
										filter: 'blur(30px)'
									}}
								/>
							</div>

							<div className="relative z-10 px-6 py-10 text-center md:px-10 md:py-12">
								<h3 className="mb-3 text-xl font-extrabold tracking-[-0.02em] text-black md:text-2xl dark:text-white">
									Ready to try LlamaAI?
								</h3>
								<p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#555] md:text-base dark:text-[#9a9a9f]">
									Research protocols, generate charts, and stay ahead of the market.
								</p>
								<CTAButton />
							</div>
						</div>
					</div>
				</section>
			</div>

			<Suspense fallback={null}>
				<SubscribeProModal dialogStore={subscribeModalStore} returnUrl="/ai/chat" />
			</Suspense>
		</>
	)
}

const FAQ = ({ question, children }: { question: string; children: React.ReactNode }) => {
	return (
		<details className="group">
			<summary className="flex cursor-pointer items-center gap-4 py-4 md:py-5">
				<span className="flex-1 text-[15px] font-medium text-black transition-colors group-hover:text-[#C99A4A] md:text-base dark:text-white dark:group-hover:text-[#FDE0A9]">
					{question}
				</span>
				<Icon
					name="chevron-down"
					height={16}
					width={16}
					className="shrink-0 text-[#999] transition-transform duration-200 group-open:rotate-180 dark:text-[#666]"
				/>
			</summary>
			<div className="pb-4 text-[14px] leading-relaxed text-[#555] md:pb-5 md:text-[15px] dark:text-[#9a9a9f]">
				{children}
			</div>
		</details>
	)
}
