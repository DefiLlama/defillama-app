import { Icon } from '~/components/Icon'
import { ChartTabType } from './types'

const CATEGORY_TITLES: Record<ChartTabType, string> = {
	chain: 'Protocols & Chains',
	protocol: 'Protocols & Chains',
	yields: 'Yields',
	stablecoins: 'Stablecoins',
	'advanced-tvl': 'Advanced TVL'
}

interface CategoryFormHeaderProps {
	category: ChartTabType
	onBack: () => void
}

export function CategoryFormHeader({ category, onBack }: CategoryFormHeaderProps) {
	return (
		<div className="pro-border mb-3 flex items-center gap-2 border-b pb-3">
			<button
				onClick={onBack}
				className="pro-hover-bg flex items-center justify-center rounded p-1.5 transition-colors"
				title="Back to categories"
			>
				<Icon name="arrow-left" height={18} width={18} />
			</button>
			<span className="pro-text1 text-sm font-medium">{CATEGORY_TITLES[category]}</span>
		</div>
	)
}
