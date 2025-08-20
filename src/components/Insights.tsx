import { Fragment, useDeferredValue, useMemo, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { matchSorter } from 'match-sorter'
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

export function Insights({ canDismiss = false }: { canDismiss?: boolean }) {
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
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold">Insights</h1>
					{canDismiss ? (
						<Ariakit.DialogDismiss
							className="-my-2 ml-auto rounded-lg p-2 text-(--text-tertiary) hover:bg-(--divider) hover:text-(--text-primary)"
							aria-label="Close modal"
						>
							<Icon name="x" height={20} width={20} />
						</Ariakit.DialogDismiss>
					) : null}
				</div>
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

export const InsightsAndTools = ({ currentMetric }: { currentMetric: Array<string> }) => {
	const dialogStore = Ariakit.useDialogStore()
	return (
		<>
			<Ariakit.DialogProvider store={dialogStore}>
				<div className="relative isolate h-10 w-full rounded-md bg-(--cards-bg) p-1">
					<img
						src="/icons/metrics-l.svg"
						width={92}
						height={40}
						alt=""
						className="absolute top-0 left-0 h-full w-auto rounded-l-md object-cover"
						fetchPriority="high"
					/>
					<div className="flex h-full flex-wrap items-center justify-center gap-1">
						<span className="hidden items-center gap-2 rounded-md bg-(--old-blue) px-2 py-[7px] text-xs text-white lg:flex">
							<Icon name="sparkles" height={12} width={12} />
							<span>New</span>
						</span>
						{currentMetric.map((metric, i) => (
							<Fragment key={`insight-name-${metric}`}>
								{i === 1 ? (
									<span>{metric}</span>
								) : (
									<Ariakit.DialogDisclosure className="z-10 rounded-md border border-dashed border-(--old-blue) bg-[rgba(31,103,210,0.12)] px-[10px] py-1 font-semibold">
										{metric}
									</Ariakit.DialogDisclosure>
								)}
							</Fragment>
						))}
						<Ariakit.DialogDisclosure className="z-10 flex items-center gap-1 px-[6px] py-1 text-xs text-(--text-form)">
							<Icon name="search" height={12} width={12} />
							<span className="hidden sm:block">Click to browse & search</span>
						</Ariakit.DialogDisclosure>
					</div>
					<img
						src="/icons/metrics-r.svg"
						width={92}
						height={40}
						alt=""
						className="absolute top-0 right-0 h-full w-auto rounded-r-md object-cover"
						fetchPriority="high"
					/>
					<svg
						width="100%"
						height="100%"
						className="absolute top-0 right-0 bottom-0 left-0 z-0 text-[#e6e6e6] dark:text-[#222324]"
					>
						<defs>
							<linearGradient id="border-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#1f67d2" />
								<stop offset="8%" stopColor="#1f67d2" />
								<stop offset="18%" stopColor="currentColor" />
								<stop offset="82%" stopColor="currentColor" />
								<stop offset="92%" stopColor="#1f67d2" />
								<stop offset="100%" stopColor="#1f67d2" />
							</linearGradient>
						</defs>
						<rect
							x="1"
							y="1"
							width="calc(100% - 1.5px)"
							height="calc(100% - 1.5px)"
							rx="6"
							ry="6"
							fill="none"
							stroke="url(#border-gradient)"
							strokeWidth="1"
						/>
					</svg>
				</div>
				<Ariakit.Dialog
					className="dialog max-sm:drawer h-[70vh] gap-3 sm:w-full sm:max-w-[min(85vw,1280px)] lg:h-[calc(100vh-32px)]"
					unmountOnHide
				>
					<Insights canDismiss={true} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}
