import { Icon } from '~/components/Icon'
import { ChartTabType } from './types'

const CATEGORY_TITLES: Record<ChartTabType, string> = {
	chain: 'Protocols & Chains',
	protocol: 'Protocols & Chains',
	yields: 'Yields',
	stablecoins: 'Stablecoins',
	'advanced-tvl': 'Advanced TVL',
	borrowed: 'Borrowed',
	'income-statement': 'Income Statement'
}

interface CategoryFormHeaderProps {
	category: ChartTabType
	onBack: () => void
}

export function CategoryFormHeader({ category, onBack }: CategoryFormHeaderProps) {
	return (
		<div className="mb-3 flex items-center gap-2 border-b pro-border pb-3">
			<button
				onClick={onBack}
				className="flex items-center justify-center rounded pro-hover-bg p-1.5 transition-colors"
				title="Back to categories"
			>
				<Icon name="arrow-left" height={18} width={18} />
			</button>
			<span className="text-sm font-medium pro-text1">{CATEGORY_TITLES[category]}</span>
		</div>
	)
}
