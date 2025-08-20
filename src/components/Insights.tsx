import { useQuery } from '@tanstack/react-query'
import { matchSorter } from 'match-sorter'
import { useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TOTAL_TRACKED_BY_METRIC_API } from '~/constants'
import insightsAndTools from '~/public/insights-and-tools.json'
import { fetchJson } from '~/utils/async'

const others = insightsAndTools.Insights.filter((insight) => !insight.category)
const insightsByCategory = Object.entries(
	insightsAndTools.Insights.reduce((acc, insight) => {
		if (!insight.category) return acc
		const category = insight.category
		acc[category] = acc[category] || []
		acc[category].push({
			...insight,
			name: insight.name.includes(': ') ? insight.name.split(': ')[1] : insight.name,
			description: insight.description ?? ''
		})
		return acc
	}, {})
)
	.map(([category, insights]: [string, Array<{ name: string; route: string; description: string }>]) => ({
		category,
		insights
	}))
	.concat({
		category: 'Others',
		insights: others
	} as { category: string; insights: Array<{ name: string; route: string; description: string }> })

export function InsightsPages() {
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const pages = useMemo(() => {
		if (!deferredSearchValue) return insightsByCategory
		return matchSorter(insightsByCategory, deferredSearchValue, {
			keys: ['category', 'insights.*.name', 'insights.*.description'],
			threshold: matchSorter.rankings.CONTAINS
		}).map((item) => ({
			...item,
			insights: item.insights.filter(
				(insight) =>
					matchSorter([insight], deferredSearchValue, {
						keys: ['name', 'description'],
						threshold: matchSorter.rankings.CONTAINS
					}).length > 0
			)
		}))
	}, [deferredSearchValue])

	const { data: totalTrackedByMetric } = useQuery({
		queryKey: ['totalTrackedByMetric'],
		queryFn: () => fetchJson(TOTAL_TRACKED_BY_METRIC_API),
		staleTime: 60 * 60 * 1000
	})

	return (
		<>
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<h1 className="text-2xl font-bold">Insights</h1>
				<div className="relative">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						type="text"
						placeholder="Search..."
						className="dark:placeholder:[#919296] min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-[6px] pl-7 text-black outline-hidden placeholder:text-[#666] dark:text-white"
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
					/>
				</div>
			</div>
			<div className="flex flex-col gap-4">
				{pages.map(({ category, insights }) => (
					<div key={category} className="flex flex-col gap-2">
						<div className="flex flex-row items-center gap-2">
							<h2 className="text-lg font-bold">{category}</h2>
							<hr className="flex-1 border-black/20 dark:border-white/20" />
						</div>
						<div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{insights.map((insight: any) => (
								<BasicLink
									key={`insight-${insight.name}-${insight.route}`}
									className="col-span-1 flex min-h-[120px] flex-col items-start gap-[2px] rounded-md border border-(--cards-border) bg-(--cards-bg) p-[10px] hover:bg-[rgba(31,103,210,0.12)]"
									href={insight.route}
								>
									<span className="flex w-full flex-wrap items-center justify-between gap-1">
										<span className="font-medium">{insight.name}</span>
										{totalTrackedByMetric && insight.totalTrackedKey ? (
											<span className="text-xs text-(--link)">
												{getTotalTracked(totalTrackedByMetric, insight.totalTrackedKey)}
											</span>
										) : null}
									</span>
									<span className="text-start whitespace-pre-wrap text-(--text-form)">{insight.description ?? ''}</span>
								</BasicLink>
							))}
						</div>
					</div>
				))}
			</div>
		</>
	)
}

const getTotalTracked = (totalTrackedByMetric: any, totalTrackedKey: string) => {
	const value = totalTrackedKey.split('.').reduce((obj, key) => obj?.[key], totalTrackedByMetric)
	if (!value) return null
	return `${value} tracked`
}
