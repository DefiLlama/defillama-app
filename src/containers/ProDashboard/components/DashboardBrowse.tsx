import { Icon, IIcon } from '~/components/Icon'
import { useDiscoveryCategories } from '../hooks/useDiscoveryCategories'
import { Dashboard } from '../services/DashboardAPI'
import { DiscoverySection } from './DiscoverySection'

interface SectionConfig {
	key: string
	title: string
	subtitle: string
	icon: IIcon['name']
	iconBg: string
	iconColor: string
	seeAllHref: string
}

const TRENDING_TAGS = ['DeFi', 'NFT', 'L2', 'Stablecoins', 'DEX', 'Lending', 'Bridges', 'Staking']
const EMPTY_DASHBOARDS: Dashboard[] = []

const SECTIONS: SectionConfig[] = [
	{
		key: 'trendingToday',
		title: 'Trending Today',
		subtitle: 'Hot dashboards in the last 24 hours',
		icon: 'flame',
		iconBg: 'bg-blue-500/15',
		iconColor: 'text-blue-500',
		seeAllHref: '/pro?tab=discover&sortBy=trending&timeFrame=1d'
	},
	{
		key: 'trendingWeek',
		title: 'Trending This Week',
		subtitle: 'Popular picks from the past 7 days',
		icon: 'trending-up',
		iconBg: 'bg-blue-500/15',
		iconColor: 'text-blue-500',
		seeAllHref: '/pro?tab=discover&sortBy=trending&timeFrame=7d'
	},
	{
		key: 'popular',
		title: 'Most Popular',
		subtitle: 'All-time community favorites',
		icon: 'star',
		iconBg: 'bg-blue-500/15',
		iconColor: 'text-blue-500',
		seeAllHref: '/pro?tab=discover&sortBy=popular'
	},
	{
		key: 'recent',
		title: 'Recently Created',
		subtitle: 'Fresh dashboards just published',
		icon: 'clock',
		iconBg: 'bg-blue-500/15',
		iconColor: 'text-blue-500',
		seeAllHref: '/pro?tab=discover&sortBy=recent'
	}
]

interface DashboardBrowseProps {
	onTagClick: (tag: string) => void
}

export function DashboardBrowse({ onTagClick }: DashboardBrowseProps) {
	const { categories } = useDiscoveryCategories()

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
					<span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
						<Icon name="tag" height={14} width={14} className="text-blue-500" />
					</span>
					Trending Tags
				</h3>
				<div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
					{TRENDING_TAGS.map((tag) => (
						<button
							key={tag}
							onClick={() => onTagClick(tag)}
							className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/15 px-3.5 py-1.5 text-xs font-medium text-blue-600 transition-all duration-150 hover:scale-105 hover:shadow-sm dark:text-blue-400"
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
						subtitle={section.subtitle}
						icon={section.icon}
						iconBg={section.iconBg}
						iconColor={section.iconColor}
						dashboards={categoryData?.dashboards ?? EMPTY_DASHBOARDS}
						isLoading={categoryData?.isLoading ?? true}
						seeAllHref={section.seeAllHref}
						onTagClick={onTagClick}
					/>
				)
			})}
		</div>
	)
}
