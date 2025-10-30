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
						<span className="mt-1 block text-lg font-semibold text-black dark:text-white">Insight, accelerated</span>
					</h1>
					<p className="text-center text-lg leading-6 text-[#666] dark:text-[#919296]">
						Go beyond dashboards with DefiLlama’s data at your fingertips, turning conversation into deep, flexible
						analysis.
					</p>
					{subscription?.status === 'active' ? (
						<BasicLink
							href="/ai/chat"
							className="mx-auto flex items-center justify-between gap-[10px] rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
						>
							<img src="/icons/ask-llama-ai.svg" alt="Ask LlamaAI" className="h-4 w-4 shrink-0 brightness-0" />
							<span className="whitespace-nowrap">Try LlamaAI</span>
						</BasicLink>
					) : (
						<button
							onClick={() => setShowSubscribeModal(true)}
							className="mx-auto flex items-center justify-between gap-[10px] rounded-md bg-[linear-gradient(93.94deg,#FDE0A9_24.73%,#FBEDCB_57.42%,#FDE0A9_99.73%)] px-4 py-2 text-base font-semibold text-black shadow-[0px_0px_30px_0px_rgba(253,224,169,0.5),_0px_0px_1px_2px_rgba(255,255,255,0.1)]"
						>
							<img src="/icons/ask-llama-ai.svg" alt="Ask LlamaAI" className="h-4 w-4 shrink-0 brightness-0" />
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
						<video src="/assets/llamaai.mp4" className="z-10 h-full w-full rounded-lg object-cover" controls />
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
											'group flex w-full cursor-pointer flex-col gap-2 px-4 py-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#FDE0A9] focus-visible:outline-none',
											isActive
												? 'border-l-[3px] border-[#FDE0A9] pl-[15px] text-black dark:text-white'
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
						<div className="h-full w-full max-w-[562px] overflow-hidden rounded-br-2xl rounded-bl-2xl border-t border-[#E6E6E6] max-lg:overflow-hidden lg:rounded-tl-lg lg:rounded-bl-none lg:border-l dark:border-[#39393E]">
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
							LlamaAI is included in DefiLlama Pro along with the DefiLlama Pro dashboard builder, CSV downloads,
							LlamaFeed, and other premium features. Free users can upgrade to use it.
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
