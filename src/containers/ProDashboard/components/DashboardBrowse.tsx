import { Icon, IIcon } from '~/components/Icon'
import { useDiscoveryCategories } from '../hooks/useDiscoveryCategories'
import { DiscoverySection } from './DiscoverySection'

interface SectionConfig {
	key: string
	title: string
	icon: IIcon['name']
	seeAllHref: string
}

const TRENDING_TAGS = ['DeFi', 'NFT', 'L2', 'Stablecoins', 'DEX', 'Lending', 'Bridges', 'Staking']

const SECTIONS: SectionConfig[] = [
	{
		key: 'trendingToday',
		title: 'Trending Today',
		icon: 'flame',
		seeAllHref: '/pro?tab=discover&sortBy=trending&timeFrame=1d'
	},
	{
		key: 'trendingWeek',
		title: 'Trending This Week',
		icon: 'trending-up',
		seeAllHref: '/pro?tab=discover&sortBy=trending&timeFrame=7d'
	},
	{ key: 'popular', title: 'Most Popular', icon: 'star', seeAllHref: '/pro?tab=discover&sortBy=popular' },
	{ key: 'recent', title: 'Recently Created', icon: 'clock', seeAllHref: '/pro?tab=discover&sortBy=recent' }
]

interface DashboardBrowseProps {
	onTagClick: (tag: string) => void
}

export function DashboardBrowse({ onTagClick }: DashboardBrowseProps) {
	const { categories } = useDiscoveryCategories()

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-(--text-label)">
					<Icon name="tag" height={14} width={14} />
					Trending Tags
				</h3>
				<div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
					{TRENDING_TAGS.map((tag) => (
						<button
							key={tag}
							onClick={() => onTagClick(tag)}
							className="shrink-0 rounded-full border border-(--switch-border) px-3 py-1.5 text-xs text-(--text-form) transition-colors duration-150 hover:border-transparent hover:bg-(--link-active-bg) hover:text-white"
						>
							{tag}
						</button>
					))}
				</div>
			</div>

			{SECTIONS.map((section) => {
				const categoryData = categories[section.key]
				return (
					<DiscoverySection
						key={section.key}
						title={section.title}
						icon={section.icon}
						dashboards={categoryData?.dashboards || []}
						isLoading={categoryData?.isLoading ?? true}
						seeAllHref={section.seeAllHref}
						onTagClick={onTagClick}
					/>
				)
			})}
		</div>
	)
}
