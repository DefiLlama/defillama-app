import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import { Fragment, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TOTAL_TRACKED_BY_METRIC_API } from '~/constants'
import { getStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
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

const metricsByCategory = trending.concat(
	Object.entries(
		defillamaPages.Metrics.reduce<Record<string, IPage[]>>((acc, metric) => {
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

export function Metrics({
	canDismiss = false,
	hasScrolledToCategoryRef
}: {
	canDismiss?: boolean
	hasScrolledToCategoryRef?: React.RefObject<string>
}) {
	const [tab, setTab] = useState<(typeof TABS)[number]>('All')
	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	const router = useRouter()

	const currentCategory =
		router.pathname === '/'
			? null
			: metricsByCategory.find(
					(category) =>
						category.category !== 'Trending' && category.metrics.some((metric) => metric.route === router.pathname)
				)?.category

	const metricsInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (currentCategory && canDismiss) {
			const el = document.querySelector(`[data-category="${currentCategory}"]`)
			if (el && hasScrolledToCategoryRef && hasScrolledToCategoryRef.current !== `${currentCategory}-true`) {
				requestAnimationFrame(() => {
					hasScrolledToCategoryRef.current = `${currentCategory}-true`
					el.scrollIntoView({ behavior: 'smooth', block: 'start' })
				})
			}
		} else if (metricsInputRef.current) {
			requestAnimationFrame(() => {
				metricsInputRef.current?.focus()
			})
		}
	}, [currentCategory, canDismiss, hasScrolledToCategoryRef])

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
		queryKey: ['metrics', 'total-tracked'],
		queryFn: () => fetchJson(TOTAL_TRACKED_BY_METRIC_API),
		staleTime: 60 * 60 * 1000
	})

	return (
		<>
			<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold">Metrics</h1>
					<TagGroup selectedValue={tab} setValue={(value) => startTransition(() => setTab(value as (typeof TABS)[number]))} values={TABS} />
					{canDismiss ? (
						<Ariakit.DialogDismiss
							className="-my-2 ml-auto rounded-lg p-2 text-(--text-tertiary) hover:bg-(--divider) hover:text-(--text-primary)"
							aria-label="Close modal"
						>
							<Icon name="x" height={20} width={20} />
						</Ariakit.DialogDismiss>
					) : null}
				</div>
				<label className="relative">
					<span className="sr-only">Search pages</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						ref={metricsInputRef}
						type="text"
						inputMode="search"
						placeholder="Search..."
						className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
						value={searchValue}
						onChange={(e) => startTransition(() => setSearchValue(e.target.value))}
					/>
				</label>
				<div className="flex flex-wrap gap-2">
					{pages.map(({ category }) => (
						<button
							key={category}
							className="flex items-center gap-1 rounded-full border-2 border-(--old-blue)/60 px-2 py-1 text-xs hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
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
			<div className="flex thin-scrollbar flex-col gap-4">
				{pages.map(({ category, metrics }) => (
					<div key={category} className="relative flex flex-col gap-2">
						<div className="absolute -top-4" data-category={category} />
						<div className="flex flex-row items-center gap-2">
							<h2 className="text-lg font-bold">{category}</h2>
							<hr className="flex-1 border-black/20 dark:border-white/20" />
						</div>
						<div
							className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${canDismiss ? 'lg:grid-cols-3 xl:grid-cols-4' : 'xl:grid-cols-3 2xl:grid-cols-4'}`}
						>
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

export function LinkToMetricOrToolPage({ page, totalTrackedByMetric }: { page: IPage; totalTrackedByMetric: any }) {
	const pinnedMetrics = useSyncExternalStore(
		(callback) => subscribeToStorageKey('pinned-metrics', callback),
		() => getStorageItem('pinned-metrics', '[]') ?? '[]',
		() => '[]'
	)

	const pinnedPages = useMemo(() => JSON.parse(pinnedMetrics), [pinnedMetrics])
	const isPinned = pinnedPages.includes(page.route)

	const isExternalLink = page.route.startsWith('http')

	return (
		<div
			className={`relative col-span-1 flex min-h-[120px] flex-col ${page.route === '/' ? '' : 'group'}`}
			data-pinned={isPinned}
		>
			<BasicLink
				className="col-span-1 flex flex-1 flex-col items-start gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2.5 hover:bg-(--link-button)"
				href={page.route}
				target={isExternalLink ? '_blank' : undefined}
				rel={isExternalLink ? 'noopener noreferrer' : undefined}
			>
				<span className="flex w-full flex-wrap items-center gap-1">
					<span className="font-medium">{page.name}</span>
					{page.tags?.map((tag) =>
						tag === 'Hot' ? (
							<span
								className="flex items-center gap-1 rounded-md bg-[#D24C1F] px-1.5 py-1 text-[10px] text-white"
								key={`tag-${page.route}-${tag}`}
							>
								<Icon name="flame" height={10} width={10} />
								<span>Hot</span>
							</span>
						) : (
							<span
								className="flex items-center gap-1 rounded-md bg-(--old-blue) px-1.5 py-1 text-[10px] text-white"
								key={`tag-${page.route}-${tag}`}
							>
								<Icon name="sparkles" height={10} width={10} />
								<span>New</span>
							</span>
						)
					)}
					<Icon name="arrow-right" height={16} width={16} className="ml-auto" />
				</span>
				{totalTrackedByMetric && page.totalTrackedKey ? (
					<span className="text-xs text-(--link)">{getTotalTracked(totalTrackedByMetric, page.totalTrackedKey)}</span>
				) : null}
				<span className="pt-0 text-start whitespace-pre-wrap text-(--text-form)">{page.description ?? ''}</span>
			</BasicLink>

			<Tooltip
				content={isPinned ? 'Unpin from navigation' : 'Pin to navigation'}
				render={
					<button
						onClick={(e) => {
							const currentPinnedMetrics = JSON.parse(window.localStorage.getItem('pinned-metrics') || '[]')
							setStorageItem(
								'pinned-metrics',
								JSON.stringify(
									currentPinnedMetrics.includes(page.route)
										? currentPinnedMetrics.filter((metric: string) => metric !== page.route)
										: [...currentPinnedMetrics, page.route]
								)
							)
							e.preventDefault()
							e.stopPropagation()
						}}
					/>
				}
				className="absolute top-1 right-1 hidden rounded-md bg-(--old-blue) p-1.5 text-white group-hover:block group-data-[pinned=true]:block"
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

export function MetricsAndTools({ currentMetric }: { currentMetric: Array<string> }) {
	const dialogStore = Ariakit.useDialogStore()
	const hasScrolledToCategoryRef = useRef('')
	return (
		<>
			<Ariakit.DialogProvider store={dialogStore}>
				<div className="relative isolate w-full rounded-md bg-(--cards-bg) p-1">
					{/* Left decorative dot pattern */}
					<div
						className="pointer-events-none absolute top-px left-px h-[calc(100%-2px)] w-16 overflow-hidden rounded-l-[6px] sm:w-24 md:w-48"
						aria-hidden="true"
					>
						<div
							className="absolute inset-0"
							style={{
								backgroundImage: `radial-gradient(circle, rgba(31, 103, 210, 0.6) 0.8px, transparent 0.8px)`,
								backgroundSize: '3px 3px',
								maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
								WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)'
							}}
						/>
					</div>
					<div className="flex h-full flex-wrap items-center justify-center gap-1">
						{currentMetric.map((metric, i) => (
							<Fragment key={`metric-name-${metric}`}>
								{i === 1 ? (
									<span>{metric}</span>
								) : (
									<Ariakit.DialogDisclosure className="z-10 rounded-md border border-dashed border-(--old-blue) bg-(--link-button) px-2.5 py-1 font-semibold hover:bg-(--link-button-hover)">
										{metric}
									</Ariakit.DialogDisclosure>
								)}
							</Fragment>
						))}
						<Ariakit.DialogDisclosure className="z-10 flex items-center gap-1 px-1.5 py-1 text-xs text-(--text-form)">
							<Icon name="search" height={12} width={12} />
							<span className="hidden sm:block">Click to browse & search</span>
						</Ariakit.DialogDisclosure>
					</div>
					{/* Right decorative dot pattern */}
					<div
						className="pointer-events-none absolute top-px right-px h-[calc(100%-2px)] w-16 overflow-hidden rounded-r-[6px] sm:w-24 md:w-48"
						aria-hidden="true"
					>
						<div
							className="absolute inset-0"
							style={{
								backgroundImage: `radial-gradient(circle, rgba(31, 103, 210, 0.6) 0.8px, transparent 0.8px)`,
								backgroundSize: '3px 3px',
								maskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
								WebkitMaskImage: 'linear-gradient(to left, black 0%, transparent 100%)'
							}}
						/>
					</div>
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
					className="dialog thin-scrollbar h-full max-h-[calc(100dvh-80px)] gap-3 max-sm:drawer sm:w-full sm:max-w-[min(85vw,1280px)]"
					unmountOnHide
					hideOnInteractOutside
				>
					<Metrics canDismiss={true} hasScrolledToCategoryRef={hasScrolledToCategoryRef} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}
