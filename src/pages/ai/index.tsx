import { lazy, Suspense, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SEO } from '~/components/SEO'
import { useSubscribe } from '~/hooks/useSubscribe'
import { cn } from '~/utils/cn'

const FEATURE_SECTIONS = [
	{
		title: 'Which protocols show strong 30-day growth but falling prices?',
		description:
			'Combines TVL, fee, and price data to uncover projects where fundamentals are surging while sentiment lags — highlighting potential mispriced opportunities across DeFi.'
	},
	{
		title: 'Which weekday is statistically best to buy Bitcoin?',
		description:
			'Calculates average daily BTC returns by weekday, ranks buy windows, and auto-builds a bar chart + table — surfacing midweek rallies, Friday dips, and weekend volatility.'
	},
	{
		title: 'Who’s winning the perpetuals war between Hyperliquid, Lighter & Aster?',
		description:
			'Compares trading volume, open interest, and protocol revenue growth across top perp platforms — revealing which one’s gaining real traction versus speculative hype.'
	}
]

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export default function LlamaAIGetStarted() {
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const [activeFeature, setActiveFeature] = useState(0)
	const { subscription } = useSubscribe()

	return (
		<>
			<SEO
				title="LlamaAI - DefiLlama"
				description="Ask questions, generate charts, and explore any DeFi metric instantly. LlamaAI brings the power of DefiLlama's comprehensive data to your fingertips through natural conversation."
				keywords="LlamaAI, DefiLlama AI, DeFi AI"
				canonicalUrl="https://defillama.com/ai"
			/>
			<div className="col-span-full flex h-full flex-col gap-15 bg-[#F7F7F7] px-2 dark:bg-[#17181c]">
				<div className="p-3">
					<BasicLink href="/" className="mb-4 w-fit shrink-0">
						<span className="sr-only">Navigate to Home Page</span>
						<img
							src="/icons/defillama.webp"
							height={36}
							width={105}
							className="mr-auto hidden object-contain object-left dark:block"
							alt=""
							fetchPriority="high"
						/>
						<img
							src="/icons/defillama-dark.webp"
							height={36}
							width={105}
							className="mr-auto object-contain object-left dark:hidden"
							alt=""
							fetchPriority="high"
						/>
					</BasicLink>
				</div>
				<div className="mx-auto flex w-full max-w-[585px] flex-col items-center justify-center gap-4">
					<span className="relative flex flex-col items-center justify-center">
						<span
							className="absolute block h-24.5 w-24.5 shrink-0"
							style={{ background: 'linear-gradient(90deg, #FEE2AD 0%, #FEE2AD 100%)', filter: 'blur(32px)' }}
						></span>
						<img src="/icons/llama-ai.svg" alt="LlamaAI" className="z-10 object-contain" width={83} height={99} />
					</span>
					<h1 className="-mt-1 -mb-2 text-center text-[2rem] leading-8 font-extrabold text-black dark:text-white">
						<span>LlamaAI</span>
					</h1>
					<p className="text-center text-lg leading-6 text-[#666] dark:text-[#919296]">
						Your conversational interface to DefiLlama’s data for deep, flexible analysis.
					</p>
					{subscription?.status === 'active' ? (
						<BasicLink
							href="/ai/chat"
							data-umami-event="llamaai-landing-cta-subscribed"
							className="llamaai-glow relative mx-auto flex items-center justify-between gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
						>
							<svg className="h-4 w-4 shrink-0">
								<use href="/icons/ask-llamaai-3.svg#ai-icon" />
							</svg>
							<span className="whitespace-nowrap">Try LlamaAI</span>
						</BasicLink>
					) : (
						<button
							onClick={() => setShowSubscribeModal(true)}
							data-umami-event="llamaai-landing-cta-unsubscribed"
							className="llamaai-glow relative mx-auto flex items-center justify-between gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
						>
							<svg className="h-4 w-4 shrink-0">
								<use href="/icons/ask-llamaai-3.svg#ai-icon" />
							</svg>
							<span className="whitespace-nowrap">Try LlamaAI</span>
						</button>
					)}
				</div>
				<div className="relative isolate mx-auto w-full max-w-5xl">
					<span
						className="absolute right-0 left-0 mx-auto block h-33 w-full max-w-[85%] shrink-0"
						style={{
							background: 'linear-gradient(90deg, #FBEDCB 0%, #FDE0A9 100%)',
							filter: 'blur(32px)',
							borderRadius: '50%'
						}}
					></span>
					<div className="relative isolate z-10 mx-auto mt-[45px] w-full max-w-5xl rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-4 dark:border-[#39393E] dark:bg-[#222429]">
						<video
							preload="metadata"
							className="h-full w-full rounded-lg object-cover"
							playsInline
							controls
							poster="/assets/poster.png"
							disablePictureInPicture
							style={{ aspectRatio: '990 / 556.88' }}
						>
							<source src="/assets/llamaai.mp4" type="video/mp4" />
							Your browser does not support the video tag.
						</video>
					</div>
				</div>
				<div className="mx-auto mb-15 w-full max-w-5xl">
					<h2 className="mb-5 text-center text-[2rem] leading-8 font-extrabold text-black dark:text-white">
						Why LlamaAI
					</h2>
					<div
						className="no-scrollbar -mx-2 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:overflow-x-visible md:px-0 md:pb-0"
						style={{
							scrollSnapType: 'x mandatory',
							scrollPaddingLeft: '16px',
							scrollPaddingRight: '16px',
							WebkitOverflowScrolling: 'touch'
						}}
					>
						<div
							className="w-[calc(100vw-72px)] shrink-0 snap-start rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-6 md:w-auto dark:border-[#39393E] dark:bg-[#222429]"
							style={{ scrollMarginLeft: '28px' }}
						>
							<div className="mb-2 flex flex-nowrap items-center gap-4">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FBEDCB50] text-[#C99A4A] dark:bg-[#FDE0A91F] dark:text-[#FDE0A9]">
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
								</div>
								<h3 className="text-lg font-semibold text-black dark:text-white">Faster Insights</h3>
							</div>
							<p className="text-base leading-6 text-[#666] dark:text-[#919296]">
								LlamaAI leverages DefiLlama’s data to handle the heavy lifting of analysis so you can move from question
								to insight in a fraction of the time.
							</p>
						</div>

						<div
							className="w-[calc(100vw-72px)] shrink-0 snap-start rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-6 md:w-auto dark:border-[#39393E] dark:bg-[#222429]"
							style={{ scrollMarginLeft: '20px', scrollMarginRight: '12px' }}
						>
							<div className="mb-2 flex flex-nowrap items-center gap-4">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FBEDCB50] text-[#C99A4A] dark:bg-[#FDE0A91F] dark:text-[#FDE0A9]">
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
								</div>
								<h3 className="text-lg font-semibold text-black dark:text-white">Automatic Charts</h3>
							</div>
							<p className="text-base leading-6 text-[#666] dark:text-[#919296]">
								Generates the right chart for your query and pairs it with structured insights, visual context, and
								downloadable data, giving you clear results ready to explore or refine.
							</p>
						</div>

						<div className="w-[calc(100vw-72px)] shrink-0 snap-start rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-6 md:w-auto dark:border-[#39393E] dark:bg-[#222429]">
							<div className="mb-2 flex flex-nowrap items-center gap-4">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FBEDCB50] text-[#C99A4A] dark:bg-[#FDE0A91F] dark:text-[#FDE0A9]">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<path
											d="M22 17C22 17.5304 21.7893 18.0391 21.4142 18.4142C21.0391 18.7893 20.5304 19 20 19H6.828C6.29761 19.0001 5.78899 19.2109 5.414 19.586L3.212 21.788C3.1127 21.8873 2.9862 21.9549 2.84849 21.9823C2.71077 22.0097 2.56803 21.9956 2.43831 21.9419C2.30858 21.8881 2.1977 21.7971 2.11969 21.6804C2.04167 21.5637 2.00002 21.4264 2 21.286V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V17Z"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M12 11H12.01"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M16 11H16.01"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M8 11H8.01"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</div>
								<h3 className="text-lg font-semibold text-black dark:text-white">Connect the Dots</h3>
							</div>
							<p className="text-base leading-6 text-[#666] dark:text-[#919296]">
								Navigate DefiLlama’s dataset with flexibility, combining metrics, comparing chains and protocols, and
								surfacing insights that aren’t easily discoverable on dashboards using natural language.
							</p>
						</div>
					</div>
				</div>
				<div className="mx-auto mb-15 flex w-full max-w-5xl flex-col gap-4">
					<h2 className="text-center text-[2rem] leading-8 font-extrabold text-black dark:text-white">
						See what’s possible with LlamaAI
					</h2>
					<div className="flex flex-col rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] lg:flex-row lg:pt-8 dark:border-[#39393E] dark:bg-[#222429]">
						<div className="flex flex-1 flex-col gap-2 px-4 py-4 lg:px-8 lg:pt-0 lg:pb-8">
							{FEATURE_SECTIONS.map((section, index) => {
								const isActive = index === activeFeature

								return (
									<button
										key={section.title}
										type="button"
										onClick={() => setActiveFeature(index)}
										className={cn(
											'group flex w-full cursor-pointer touch-pan-y flex-col gap-2 px-4 py-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#FDE0A9] focus-visible:outline-none',
											isActive
												? 'border-l-[3px] border-[#C99A4A] pl-[15px] text-black dark:border-[#FDE0A9] dark:text-white'
												: 'border-l-[3px] border-transparent pl-[15px] text-[#666] opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 dark:text-[#6F7074]'
										)}
										aria-pressed={isActive}
									>
										<span
											className={cn(
												'text-lg font-semibold transition-colors duration-200',
												isActive ? 'text-black dark:text-white' : 'text-[#666] dark:text-[#919296]'
											)}
										>
											{section.title}
										</span>
										<span
											className={cn(
												'text-base leading-6 transition-colors duration-200',
												isActive ? 'text-[#666] dark:text-[#919296]' : 'text-[#666]/80 dark:text-[#6F7074]'
											)}
										>
											{section.description}
										</span>
									</button>
								)
							})}
						</div>
						<div className="h-full w-full overflow-hidden rounded-br-2xl rounded-bl-2xl border-t border-[#E6E6E6] max-lg:overflow-hidden lg:max-w-[562px] lg:rounded-tl-lg lg:rounded-bl-none lg:border-l dark:border-[#39393E]">
							<img
								src={`/assets/llamaai-${activeFeature > 2 ? 1 : activeFeature + 1}.png`}
								alt=""
								className="hidden h-full w-full bg-[#131516] object-contain object-top dark:block"
							/>
							<img
								src={`/assets/llamaai-${activeFeature > 2 ? 1 : activeFeature + 1}-light.png`}
								alt=""
								className="block h-full w-full bg-[#fffff] object-contain object-top dark:hidden"
							/>
						</div>
					</div>
				</div>
				<div className="mx-auto mb-15 w-full max-w-5xl">
					<h2 className="text-center text-[2rem] leading-8 font-extrabold text-black dark:text-white">FAQ</h2>
					<FAQ question="What is LlamaAI?">
						<p>
							An onchain analyst. You ask in plain language. It compiles the exact query against DefiLlama data and
							returns ranked tables, custom charts, and analysis. Since LlamaAI has access to the entire DefiLlama
							dataset, it excels at performing more detailed analysis than is possible on the main DefiLlama site.
						</p>
					</FAQ>
					<FAQ question="What can it do right now?">
						<ul className="flex list-disc flex-col gap-2 pl-4">
							<li>
								Perform deep analysis, such as identifying categories with the most stable revenue streams or finding
								which protocols have the most consistently revenue growth.
							</li>
							<li>
								Run complex queries to find protocols, chains, and categories that meet specific criteria. For example,
								LlamaAI could identify protocols that are growing in TVL and Revenue, while their token price fell.
							</li>
							<li>Generate custom charts filtered by protocol, chain, category, or token.</li>
						</ul>
					</FAQ>
					<FAQ question="Where does the data come from?">
						<p>
							The full DefiLlama dataset: protocols, chains, categories, fees, revenue, TVL, volumes, OI, etc, and
							related derived metrics.
						</p>
					</FAQ>
					<FAQ question="What sort of prompts can it answer?">
						<p>Here are a few example prompts to use with LlamaAI:</p>
						<ul className="flex list-disc flex-col gap-2 pl-4">
							<li>“Which 5 protocols have the most stable revenue streams?”</li>
							<li>“Create a chart of total capital raised vs total value lost to hacks by year.”</li>
							<li>“Which chains have the highest innovation ratio (original protocol TVL / forked protocol TVL)?”</li>
							<li>“Which categories show the highest revenue stability?”</li>
						</ul>
					</FAQ>
					<FAQ question="Who has access?">
						<p>
							LlamaAI is included in all paid subscriptions along with the DefiLlama Pro dashboard builder, CSV
							downloads, LlamaFeed, and other premium features. Free users can upgrade to use it.
						</p>
					</FAQ>
					<FAQ question="Can I export results?">
						<p>Yes. You can download returned tables and charts as CSVs.</p>
					</FAQ>
					<FAQ question="What metrics are supported?">
						<p>
							Metrics from DefiLlama are supported, including TVL, fees, revenue, holder revenue, P/F, PS, volumes, open
							interest, plus category/chain/protocol/token filters.
						</p>
						<p>LlamaAI also has access to other DefiLlama datasets, such as our Hacks and Raises databases.</p>
					</FAQ>
					<FAQ question="Is this investment advice?">
						<p>
							No. It’s data, rankings, charts, and analysis. Do your own research, which LlamaAI can hopefully be a
							critical tool for.
						</p>
					</FAQ>
					<FAQ question="Need help?">
						<p>
							Contact{' '}
							<a href="mailto:support@defillama.com" className="underline">
								support@defillama.com
							</a>
						</p>
					</FAQ>
				</div>
				<div className="mx-auto mt-10 mb-20 w-full max-w-5xl">
					<div className="rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-6 text-center dark:border-[#39393E] dark:bg-[#222429]">
						<h3 className="text-xl font-extrabold text-black dark:text-white">Ready to try LlamaAI?</h3>
						<p className="mx-auto mt-2 max-w-[620px] text-base leading-6 text-[#666] dark:text-[#919296]">
							Ask in natural language to explore, chart, and analyze DefiLlama data in one place.
						</p>

						<div className="mt-5 flex items-center justify-center">
							{subscription?.status === 'active' ? (
								<BasicLink
									href="/ai/chat"
									data-umami-event="llamaai-landing-cta-bottom-subscribed"
									className="llamaai-glow relative flex items-center justify-between gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-5 py-2.5 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
								>
									<svg className="h-4 w-4 shrink-0">
										<use href="/icons/ask-llamaai-3.svg#ai-icon" />
									</svg>
									<span className="whitespace-nowrap">Open LlamaAI</span>
								</BasicLink>
							) : (
								<button
									onClick={() => setShowSubscribeModal(true)}
									data-umami-event="llamaai-landing-cta-bottom-unsubscribed"
									className="llamaai-glow relative flex items-center justify-between gap-[10px] overflow-hidden rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-5 py-2.5 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
								>
									<svg className="h-4 w-4 shrink-0">
										<use href="/icons/ask-llamaai-3.svg#ai-icon" />
									</svg>
									<span className="whitespace-nowrap">Try LlamaAI</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			<Suspense fallback={<></>}>
				<SubscribeProModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)} />
			</Suspense>
		</>
	)
}

const FAQ = ({ question, children }: { question: string; children: React.ReactNode }) => {
	return (
		<details className="group border-t border-[#e6e6e6] py-4 first-of-type:border-t-0 dark:border-[#39393E]">
			<summary className="flex items-center justify-between gap-4 text-lg font-extrabold">
				<span>{question}</span>
				<Icon
					name="chevron-down"
					height={24}
					width={24}
					className="text-[#666] transition-transform duration-100 group-open:rotate-180 dark:text-[#919296]"
				/>
			</summary>
			<div className="flex flex-col gap-2 pt-2 text-base leading-6 text-[#666] dark:text-[#919296]">{children}</div>
		</details>
	)
}
