import { useMemo } from 'react'
import { type IIcon } from '~/components/Icon'
import { useSuggestedQuestions } from '../hooks/useSuggestedQuestions'
import { PromptCarousel } from './PromptCarousel'

const CATEGORY_KEY_MAP: Record<string, string> = {
	find_alpha: 'Find Alpha',
	analytics: 'Analytics',
	speculative_guidance: 'Speculative Guidance',
	learn: 'Learn',
	research_report: 'Research Report'
}

const CATEGORY_ICON_MAP: Record<string, IIcon['name']> = {
	find_alpha: 'trending-up',
	analytics: 'bar-chart-2',
	speculative_guidance: 'dollar-sign',
	learn: 'graduation-cap',
	research_report: 'file-text'
}

const fallbackPromptCategories: Array<{
	key: string
	name: string
	icon: IIcon['name']
	prompts: string[]
}> = [
	{
		key: 'find_alpha',
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
		key: 'analytics',
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
		key: 'speculative_guidance',
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
		key: 'learn',
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
]

const fallbackResearchCategory = {
	key: 'research_report',
	name: 'Research Report',
	icon: 'file-text' as IIcon['name'],
	prompts: [
		'Analysis of prediction markets: Polymarket dominance and growth potential post-election cycle',
		'Deep dive into Hyperliquid',
		'State of the stablecoin landscape with focus on CBDCs',
		'Research the crypto AI agent ecosystem',
		'Analyze Ethena USDe: the funding rate arbitrage mechanism, collateral composition, risks during negative funding periods, and comparison to other synthetic dollars'
	]
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
	const { data: apiData, isLoading, error } = useSuggestedQuestions()

	const categories = useMemo(() => {
		if (!apiData?.categories) {
			return isResearchMode ? [fallbackResearchCategory] : fallbackPromptCategories
		}

		const allCategories = Object.entries(apiData.categories).map(([key, prompts]) => ({
			key,
			name: CATEGORY_KEY_MAP[key] || key,
			icon: CATEGORY_ICON_MAP[key] || ('help-circle' as IIcon['name']),
			prompts
		}))

		if (isResearchMode) {
			return allCategories.filter((c) => c.key === 'research_report')
		}

		return allCategories.filter((c) => c.key !== 'research_report')
	}, [apiData, isResearchMode])

	return (
		<PromptCarousel
			categories={categories}
			setPrompt={setPrompt}
			submitPrompt={submitPrompt}
			isPending={isPending}
			isLoading={isLoading}
			error={error}
		/>
	)
}
