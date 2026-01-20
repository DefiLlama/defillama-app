import { memo } from 'react'
import { Icon, type IIcon } from '~/components/Icon'
import { ChartTabType } from './types'

type IconName = IIcon['name']

export interface CategoryCardData {
	id: ChartTabType
	title: string
	description: string
	icon: IconName
	tags: string[]
}

export const CATEGORY_CARDS: CategoryCardData[] = [
	{
		id: 'chain',
		title: 'Protocols & Chains',
		description: 'TVL, Fees, Revenue, Volume, Users across 5000+ protocols and 450+ chains',
		icon: 'layers',
		tags: ['TVL', 'Fees', 'Revenue', 'Volume', 'Users']
	},
	{
		id: 'income-statement',
		title: 'Income Statement',
		description: 'Financial flows with table and Sankey views for protocols with fees and revenue',
		icon: 'file-text',
		tags: ['Table', 'Sankey', 'Fees', 'Revenue']
	},
	{
		id: 'yields',
		title: 'Yields & Lending',
		description: 'Supply/Borrow APY, TVL, and pool liquidity for 17000+ yield pools',
		icon: 'trending-up',
		tags: ['Supply APY', 'Borrow APY', 'TVL', 'Liquidity']
	},
	{
		id: 'advanced-tvl',
		title: 'Advanced TVL',
		description: 'Token-level breakdown, inflows, detailed protocol analysis across 5000+ protocols',
		icon: 'bar-chart-2',
		tags: ['Tokens', 'Inflows', 'Breakdown']
	},
	{
		id: 'borrowed',
		title: 'Borrowed',
		description: 'Borrowed breakdowns by chain and token for lending protocols',
		icon: 'banknote',
		tags: ['Borrowed', 'Chains', 'Tokens']
	},
	{
		id: 'stablecoins',
		title: 'Stablecoins',
		description: 'Market cap, dominance, inflows by chain or asset',
		icon: 'dollar-sign',
		tags: ['Market Cap', 'Dominance', 'Inflows']
	}
]

interface CategoryCardProps {
	card: CategoryCardData
	onClick: () => void
}

export const CategoryCard = memo(function CategoryCard({ card, onClick }: CategoryCardProps) {
	return (
		<button
			onClick={onClick}
			className="flex h-full flex-col items-start justify-between rounded-lg border pro-border p-4 text-left transition-all hover:border-(--primary)/40 hover:bg-(--cards-bg-alt)"
		>
			<div className="flex flex-col items-start gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--primary)/10">
					<Icon name={card.icon} height={22} width={22} className="text-(--primary)" />
				</div>
				<div>
					<h3 className="text-base font-semibold pro-text1">{card.title}</h3>
					<p className="mt-1 text-sm leading-relaxed pro-text2">{card.description}</p>
				</div>
			</div>
			<div className="flex flex-wrap gap-1.5 pt-3">
				{card.tags.map((tag) => (
					<span
						key={tag}
						className="rounded-full border border-(--switch-border) px-2.5 py-1 text-xs text-(--text-secondary)"
					>
						{tag}
					</span>
				))}
			</div>
		</button>
	)
})
