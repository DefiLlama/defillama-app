import { useEffect } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'

const promptCategories = [
	{
		name: 'Analytics',
		icon: 'bar-chart-2',
		prompts: [
			'Give me a chart of total app revenue divided by category',
			'Show me a chart of total TVL of all forked projects vs non-forked projects',
			'Chart Pump.fun percentage share of total revenue across all launchpads',
			'Generate a line chart of BTC deposited into DeFi over time',
			'Which 5 protocols have the most stable revenue streams?',
			'Create a chart showing which chains capture the most fees per dollar of TVL'
		]
	},
	{
		name: 'Deep Dive',
		icon: 'eye',
		prompts: [
			"What's the correlation between protocol token unlock schedules and 30-day price performance for top 20 protocols with upcoming unlocks?",
			'For protocols with >$50M TVL, show me those with growing fundamentals (TVL+fees up 30d) but declining token prices - potential value traps or opportunities?',
			'Do chains that launch with new protocols achieve better long-term TVL growth than chains that launch with mostly forked protocols?',
			'Which categories show the highest revenue stability?'
		]
	},
	{
		name: 'Risk Analysis',
		icon: 'alert-triangle',
		prompts: [
			'Create a chart of total capital raised vs total value lost to hacks by year',
			'Which categories have the highest protocol failure rate (protocols that launched but dropped below $100k TVL within 6 months)?'
		]
	},
	{
		name: 'Forks',
		icon: 'repeat',
		prompts: [
			'Show me the top 10 original protocols by fork TVL, then break down what percentage of each fork ecosystem is controlled by the largest fork',
			'Which successful fork surpassed its original protocol in TVL?',
			'Which chains have the highest innovation ratio (original protocol TVL / forked protocol TVL)?'
		]
	}
	// {
	// 	name: 'Llama`s choice',
	// 	icon: 'sparkles',
	// }
] as const

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
	isPending
}: {
	setPrompt: (prompt: string) => void
	submitPrompt: (prompt: { userQuestion: string }) => void
	isPending: boolean
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

	return (
		<div className="mb-2.5 flex min-h-0 w-full flex-1 flex-col gap-2.5">
			<Ariakit.TabProvider store={store}>
				<Ariakit.TabList className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2.5">
					{promptCategories.map((category) => (
						<Ariakit.Tab
							key={`prompt-category-${category.name}`}
							id={`tab-${category.name}`}
							tabbable
							className="flex items-center justify-center gap-2.5 rounded-lg border border-[#e6e6e6] px-4 py-1 text-[#666] hover:bg-[#f7f7f7] hover:text-black focus-visible:bg-[#f7f7f7] focus-visible:text-black dark:border-[#222324] dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white dark:focus-visible:bg-[#222324] dark:focus-visible:text-white"
						>
							<Icon name={category.icon} height={16} width={16} />
							<span>{category.name}</span>
						</Ariakit.Tab>
					))}
				</Ariakit.TabList>
				{promptCategories.map((category) => (
					<Ariakit.TabPanel
						key={`prompt-category-content-${category.name}`}
						tabId={`tab-${category.name}`}
						className="isolate flex min-h-0 w-full flex-col overflow-y-auto rounded-lg border border-[#e6e6e6] bg-(--app-bg) text-black md:mx-auto md:max-w-[80dvh] dark:border-[#222324] dark:text-white"
					>
						<div className="sticky top-0 z-10 flex shrink-0 items-center gap-2.5 bg-(--app-bg) p-2.5 text-[#666] dark:text-[#919296]">
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
						{isLoading ? (
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
		</div>
	)
}
