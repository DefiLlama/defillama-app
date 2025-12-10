import { IIcon } from '~/components/Icon'
import { useDiscoveryCategories } from '../hooks/useDiscoveryCategories'
import { DiscoverySection } from './DiscoverySection'

interface SectionConfig {
	key: string
	title: string
	icon: IIcon['name']
	seeAllHref: string
}

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
		<div className="flex flex-col gap-8">
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
