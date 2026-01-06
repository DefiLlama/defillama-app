import { useEffect } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'

const promptCategories = [
	{
		name: 'Find Alpha',
		icon: 'trending-up',
		prompts: [
			'Which protocols have growing TVL and revenue but declining token prices?',
			'What are the best stablecoin yields with at least $10M TVL?',
			'Find protocols under $500M market cap with low P/S ratios and growing revenue',
			'Which tokens are seeing the fastest TVL growth while their price decreased?',
			'For protocols with >$50M TVL, show me those with growing fundamentals (TVL+fees up 30d) but declining token prices - potential value traps or opportunities?'
		]
	},
	{
		name: 'Analytics',
		icon: 'bar-chart-2',
		prompts: [
			'Chart Pump.fun percentage share of total revenue across all launchpads',
			'Give me a chart of total app revenue divided by category',
			'Which chains have the highest innovation ratio (original protocol TVL / forked protocol TVL)?',
			"What's the correlation between protocol token unlock schedules and 30-day price performance for top 20 protocols with upcoming unlocks?",
			'Which categories have the highest protocol failure rate (protocols that launched but dropped below $100k TVL within 6 months)?'
		]
	},
	{
		name: 'Speculative Guidance',
		icon: 'dollar-sign',
		prompts: [
			'Provide a price estimate for BTC using a blended methodology that includes technical indicators, Monte Carlo simulations, and time-series momentum with a 180-day lookback. Incorporate relevant prediction-market bets or implied probabilities where available, and conclude with a synthesized investment recommendation that integrates all signals.',
			'Is the current market sentiment bullish or bearish based on on-chain data?',
			'What are the probabilities that ETH price will go lower?',
			'Should I short Virtuals Protocol?'
		]
	},
	{
		name: 'Learn',
		icon: 'graduation-cap',
		prompts: [
			'What are the technical differences btw Hyperliquid and Lighter?',
			'Explain Ethereum staking',
			'How does polymarket work?',
			"How could quantum computers compromise Bitcoin's security?",
			'What makes Base different from other L2s?'
		]
	}
	// {
	// 	name: 'Llama`s choice',
	// 	icon: 'sparkles',
	// }
] as const

const researchCategory = {
	name: 'Research Report',
	icon: 'file-text',
	prompts: [
		'Analysis of prediction markets: Polymarket dominance and growth potential post-election cycle',
		'Deep dive into Hyperliquid',
		'State of the stablecoin landscape with focus on CBDCs',
		'Research the crypto AI agent ecosystem',
		'Analyze Ethena USDe: the funding rate arbitrage mechanism, collateral composition, risks during negative funding periods, and comparison to other synthetic dollars'
	]
} as const

async function getRecommendedPrompts() {
	try {
		return Object.fromEntries(promptCategories.map((category) => [category.name, category.prompts]))
	} catch (error) {
		console.log(error)
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch recommended prompts')
	}
}

export const RecommendedPrompts = ({
	setPrompt,
	submitPrompt,
	isPending,
	isResearchMode
}: {
	setPrompt: (prompt: string) => void
	submitPrompt: (prompt: { userQuestion: string }) => void
	isPending: boolean
	isResearchMode?: boolean
}) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['recommended-prompts'],
		queryFn: getRecommendedPrompts
	})

	const store = Ariakit.useTabStore({ defaultSelectedId: 'none' })

	useEffect(() => {
		const hideTabPanel = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				store.setSelectedId('none')
			}
		}

		window.addEventListener('keydown', hideTabPanel)

		return () => {
			window.removeEventListener('keydown', hideTabPanel)
		}
	}, [])

	useEffect(() => {
		const hideTabPanelOnClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement

			// Check if the clicked element or any of its ancestors has role="tab" or role="tabpanel"
			let element: HTMLElement | null = target
			while (element) {
				const role = element.getAttribute('role')
				if (role === 'tab' || role === 'tabpanel') {
					return
				}
				element = element.parentElement
			}

			// If we get here, the click was not on a tab or tabpanel, so close
			store.setSelectedId('none')
		}

		window.addEventListener('click', hideTabPanelOnClickOutside)

		return () => {
			window.removeEventListener('click', hideTabPanelOnClickOutside)
		}
	}, [])

	const categories = isResearchMode ? [researchCategory] : promptCategories

	return (
		<>
			<Ariakit.TabProvider store={store}>
				<Ariakit.TabList className="flex w-full flex-wrap items-center justify-center gap-2.5">
					{categories.map((category) => (
						<Ariakit.Tab
							key={`prompt-category-${category.name}`}
							id={`tab-${category.name}`}
							tabbable
							className="flex items-center justify-center gap-2.5 rounded-lg border border-[#e6e6e6] px-4 py-1 text-[#666] hover:bg-[#f7f7f7] hover:text-black focus-visible:bg-[#f7f7f7] focus-visible:text-black data-[active-item]:bg-[#f7f7f7] data-[active-item]:text-black dark:border-[#222324] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white dark:focus-visible:bg-[#222324] dark:focus-visible:text-white dark:data-[active-item]:bg-[#222324] dark:data-[active-item]:text-white"
						>
							<Icon name={category.icon} height={16} width={16} />
							<span>{category.name}</span>
						</Ariakit.Tab>
					))}
				</Ariakit.TabList>
				{categories.map((category) => (
					<Ariakit.TabPanel
						key={`prompt-category-content-${category.name}`}
						tabId={`tab-${category.name}`}
						unmountOnHide
						className="max-sm:drawer max-sm:dialog isolate mb-2.5 flex w-full flex-col overflow-y-auto rounded-lg border border-[#e6e6e6] bg-(--app-bg) text-black max-sm:gap-0 max-sm:p-0 md:mx-auto md:max-w-[80dvh] dark:border-[#222324] dark:text-white"
					>
						<div className="sticky top-0 z-10 flex items-center gap-2.5 bg-(--app-bg) p-2.5 text-[#666] dark:text-[#919296]">
							<Icon name={category.icon} height={16} width={16} />
							<h1 className="mr-auto">{category.name}</h1>
							<button
								onClick={() => {
									store.setSelectedId('none')
								}}
								className="-m-2 rounded-md p-2 hover:bg-(--divider) focus-visible:bg-(--divider)"
							>
								<Icon name="x" height={16} width={16} />
								<span className="sr-only">Close</span>
							</button>
						</div>
						{isResearchMode ? (
							category.prompts.map((prompt) => (
								<button
									key={`${category.name}-${prompt}`}
									onClick={() => {
										setPrompt(prompt)
										submitPrompt({ userQuestion: prompt })
									}}
									disabled={isPending}
									className="w-full border-t border-[#e6e6e6] p-2.5 text-left last:rounded-b-lg hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white dark:border-[#222324]"
								>
									{prompt}
								</button>
							))
						) : isLoading ? (
							<div className="my-[40px] flex items-center justify-center p-2.5">
								<LoadingSpinner size={16} />
							</div>
						) : error || !data?.[category.name] ? (
							<div className="my-[40px] flex items-center justify-center gap-1 p-2.5 text-xs text-(--error)">
								<Icon name="alert-triangle" height={14} width={14} />
								<span>{error?.message ?? 'Failed to fetch recommended prompts'}</span>
							</div>
						) : (
							<>
								{data?.[category.name]?.map((prompt) => (
									<button
										key={`${category.name}-${prompt}`}
										onClick={() => {
											setPrompt(prompt)
											submitPrompt({ userQuestion: prompt })
										}}
										disabled={isPending}
										className="w-full border-t border-[#e6e6e6] p-2.5 text-left last:rounded-b-lg hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white dark:border-[#222324]"
									>
										{prompt}
									</button>
								))}
							</>
						)}
					</Ariakit.TabPanel>
				))}
			</Ariakit.TabProvider>
		</>
	)
}
