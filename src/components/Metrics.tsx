import { Fragment, useDeferredValue, useMemo, useState, useSyncExternalStore } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TOTAL_TRACKED_BY_METRIC_API } from '~/constants'
import { subscribeToPinnedMetrics } from '~/contexts/LocalStorage'
import defillamaPages from '~/public/pages.json'
import trendingPages from '~/public/trending.json'
import { fetchJson } from '~/utils/async'
import { TagGroup } from './TagGroup'
import { Tooltip } from './Tooltip'

interface IPage {
	name: string
	route: string
	description: string
	tags?: string[]
	tab?: string
	totalTrackedKey?: string
}

const trending = [{ category: 'Trending', metrics: trendingPages as Array<IPage> }]

export const metricsByCategory = trending.concat(
	Object.entries(
		defillamaPages.Metrics.reduce((acc, metric) => {
			const category = metric.category || 'Others'
			acc[category] = acc[category] || []
			acc[category].push({
				...metric,
				name: metric.name.includes(': ') ? metric.name.split(': ')[1] : metric.name,
				description: metric.description ?? ''
			})
			return acc
		}, {})
	).map(([category, metrics]: [string, Array<IPage>]) => ({
		category,
		metrics
	}))
)

const TABS = ['All', 'Protocols', 'Chains'] as const

export function Metrics({ canDismiss = false }: { canDismiss?: boolean }) {
	const [tab, setTab] = useState<(typeof TABS)[number]>('All')
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const tabPages = useMemo(() => {
		return metricsByCategory
			.concat(
				canDismiss
					? [
							{
								category: 'Tools',
								metrics: defillamaPages.Tools.map((tool: IPage) => ({
									...tool,
									description: tool.description ?? ''
								}))
							}
						]
					: []
			)
			.map((page) => ({
				category: page.category,
				metrics: page.metrics.filter((metric) => {
					if (tab === 'All') return true
					return metric.tab === tab
				})
			}))
			.filter((page) => page.metrics.length > 0)
	}, [tab, canDismiss])

	const pages = useMemo(() => {
		if (!deferredSearchValue) return tabPages

		return matchSorter(tabPages, deferredSearchValue, {
			keys: ['category', 'metrics.*.name', 'metrics.*.description', 'metrics.*.keys'],
			threshold: matchSorter.rankings.CONTAINS
		}).map((item) => {
			// If the category name matches the search term, show all metrics in that category
			const categoryMatches = item.category.toLowerCase().includes(deferredSearchValue.toLowerCase())

			return {
				...item,
				metrics: categoryMatches
					? item.metrics // Show all metrics if category matches
					: item.metrics.filter(
							(metric) =>
								matchSorter([metric], deferredSearchValue, {
									keys: ['name', 'description', 'keys'],
									threshold: matchSorter.rankings.CONTAINS
								}).length > 0
						)
			}
		})
	}, [deferredSearchValue, tabPages])

	const { data: totalTrackedByMetric } = useQuery({
		queryKey: ['totalTrackedByMetric'],
		queryFn: () => fetchJson(TOTAL_TRACKED_BY_METRIC_API),
		staleTime: 60 * 60 * 1000
	})

	return (
		<>
			<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold">Metrics</h1>
					<TagGroup selectedValue={tab} setValue={(value) => setTab(value as (typeof TABS)[number])} values={TABS} />
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
						className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-[6px] pl-7 text-black outline-hidden placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					{pages.map(({ category }) => (
						<button
							key={category}
							className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
							onClick={() => {
								const element = document.querySelector(`[data-category="${category}"]`)
								if (element) {
									element.scrollIntoView({ behavior: 'smooth', block: 'start' })
								}
							}}
						>
							{category}
						</button>
					))}
				</div>
			</div>
			<div className="thin-scrollbar flex flex-col gap-4">
				{pages.map(({ category, metrics }) => (
					<div key={category} className="relative flex flex-col gap-2">
						<div className="absolute -top-4" data-category={category} />
						<div className="flex flex-row items-center gap-2">
							<h2 className="text-lg font-bold">{category}</h2>
							<hr className="flex-1 border-black/20 dark:border-white/20" />
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{metrics.map((metric) => (
								<LinkToMetricOrToolPage
									key={`metric-${metric.name}-${metric.route}`}
									page={metric}
									totalTrackedByMetric={totalTrackedByMetric}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</>
	)
}

export const LinkToMetricOrToolPage = ({ page, totalTrackedByMetric }: { page: IPage; totalTrackedByMetric: any }) => {
	const pinnedMetrics = useSyncExternalStore(
		subscribeToPinnedMetrics,
		() => localStorage.getItem('pinned-metrics') ?? '[]',
		() => '[]'
	)

	const isPinned = useMemo(() => {
		const pinnedPages = JSON.parse(pinnedMetrics)
		return pinnedPages.includes(page.route)
	}, [pinnedMetrics, page.route])

	return (
		<div
			className={`relative col-span-1 flex min-h-[120px] flex-col ${page.route === '/' ? '' : 'group'}`}
			data-pinned={isPinned}
		>
			<BasicLink
				className="col-span-1 flex flex-1 flex-col items-start gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-[10px] hover:bg-(--link-button)"
				href={page.route}
			>
				<span className="flex w-full flex-wrap items-center justify-end gap-1">
					<span className="mr-auto font-medium">{page.name}</span>
					{page.tags?.map((tag) =>
						tag === 'Hot' ? (
							<span
								className="-mt-[4px] -mr-[2px] flex items-center gap-1 rounded-md bg-[#D24C1F] px-[6px] py-[4px] text-[10px] text-white group-hover:hidden group-data-[pinned=true]:hidden"
								key={`tag-${page.route}-${tag}`}
							>
								<Icon name="flame" height={10} width={10} />
								<span>Hot</span>
							</span>
						) : (
							<span
								className="-mt-[4px] -mr-[2px] flex items-center gap-1 rounded-md bg-(--old-blue) px-[6px] py-[4px] text-[10px] text-white group-hover:hidden group-data-[pinned=true]:hidden"
								key={`tag-${page.route}-${tag}`}
							>
								<Icon name="sparkles" height={10} width={10} />
								<span>New</span>
							</span>
						)
					)}
					{totalTrackedByMetric && page.totalTrackedKey ? (
						<span className="text-xs text-(--link) group-hover:hidden group-data-[pinned=true]:hidden">
							{getTotalTracked(totalTrackedByMetric, page.totalTrackedKey)}
						</span>
					) : null}
				</span>
				<span className="pt-0 text-start whitespace-pre-wrap text-(--text-form)">{page.description ?? ''}</span>
			</BasicLink>

			<Tooltip
				content={isPinned ? 'Unpin from navigation' : 'Pin to navigation'}
				render={
					<button
						onClick={(e) => {
							const currentPinnedMetrics = JSON.parse(window.localStorage.getItem('pinned-metrics') || '[]')
							window.localStorage.setItem(
								'pinned-metrics',
								JSON.stringify(
									currentPinnedMetrics.includes(page.route)
										? currentPinnedMetrics.filter((metric: string) => metric !== page.route)
										: [...currentPinnedMetrics, page.route]
								)
							)
							window.dispatchEvent(new Event('pinnedMetricsChange'))
							e.preventDefault()
							e.stopPropagation()
						}}
					/>
				}
				className="absolute top-1 right-1 hidden rounded-md bg-(--old-blue) p-[6px] text-white group-hover:block group-data-[pinned=true]:block"
			>
				<Icon name="pin" height={14} width={14} style={{ '--icon-fill': isPinned ? 'white' : 'none' } as any} />
			</Tooltip>
		</div>
	)
}

const getTotalTracked = (totalTrackedByMetric: any, totalTrackedKey: string) => {
	const value = totalTrackedKey.split('.').reduce((obj, key) => obj?.[key], totalTrackedByMetric)
	if (!value) return null
	return `${value} tracked`
}

export const MetricsAndTools = ({ currentMetric }: { currentMetric: Array<string> }) => {
	const dialogStore = Ariakit.useDialogStore()
	return (
		<>
			<Ariakit.DialogProvider store={dialogStore}>
				<div className="relative isolate w-full rounded-md bg-(--cards-bg) p-1">
					<img
						src="/icons/metrics-l.svg"
						width={92}
						height={40}
						alt=""
						className="absolute top-0 left-0 hidden h-full w-auto rounded-l-md object-cover md:block"
						fetchPriority="high"
					/>
					<div className="flex h-full flex-wrap items-center justify-center gap-1">
						<span className="hidden items-center gap-2 rounded-md bg-(--old-blue) px-2 py-[7px] text-xs text-white lg:flex">
							<Icon name="sparkles" height={12} width={12} />
							<span>New</span>
						</span>
						{currentMetric.map((metric, i) => (
							<Fragment key={`metric-name-${metric}`}>
								{i === 1 ? (
									<span>{metric}</span>
								) : (
									<Ariakit.DialogDisclosure className="z-10 rounded-md border border-dashed border-(--old-blue) bg-(--link-button) px-[10px] py-1 font-semibold hover:bg-(--link-button-hover)">
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
						className="absolute top-0 right-0 hidden h-full w-auto rounded-r-md object-cover md:block"
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
					className="dialog max-sm:drawer thin-scrollbar h-[70vh] gap-3 sm:w-full sm:max-w-[min(85vw,1280px)] lg:h-[calc(100vh-32px)]"
					unmountOnHide
				>
					<Metrics canDismiss={true} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}
