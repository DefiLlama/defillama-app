import { Fragment, memo, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TOTAL_TRACKED_BY_METRIC_API } from '~/constants'
import { subscribeToPinnedMetrics } from '~/contexts/LocalStorage'
import defillamaPages from '~/public/pages.json'
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
	addedAt?: number
}

// Filter metrics added in the last 30 days (or with "New" tag)
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

// Routes that are already directly linked in the left sidebar navigation - exclude these from entire metrics page
// Only includes Main section and additional main pages (not footer links like More/About Us)
const getSidebarRoutes = () => {
	const routes = new Set<string>()
	
	// Main section routes (Home, Metrics, Tools)
	if (defillamaPages.Main) {
		defillamaPages.Main.forEach((page: any) => {
			if (page.route && !page.route.startsWith('http')) {
				routes.add(page.route)
			}
		})
	}
	
	// Additional main pages (from Nav component - directly clickable in sidebar)
	routes.add('/subscription') // Pricing
	routes.add('/chains') // Chains
	routes.add('/yields') // Yields
	routes.add('/stablecoins') // Stablecoins
	routes.add('/pro') // Custom Dashboards
	routes.add('/ai') // LlamaAI
	routes.add('/ai/chat') // LlamaAI Chat
	routes.add('/sheets') // Sheets
	routes.add('/support') // Support
	
	return routes
}

const sidebarRoutes = getSidebarRoutes()

// Helper to check if a metric should be excluded (route is in sidebar)
const isExcludedFromMetrics = (metric: any) => {
	return metric.route && sidebarRoutes.has(metric.route)
}

// Routes that were added in the last 30 days (detected via git history)
const recentlyAddedRoutes = new Set([
	'/total-staked',
	'/languages',
	'/yields/loop',
	'/yields/halal',
	'/hacks',
	'/hacks/total-value-lost',
	'/nfts',
	'/nfts/earnings',
	'/nfts/marketplaces',
	'/nfts/chains',
	'/narrative-tracker',
	'/expenses',
	'/token-pnl'
])

const isNewMetric = (metric: any) => {
	// Skip if route is already in sidebar
	if (metric.route && sidebarRoutes.has(metric.route)) {
		return false
	}
	// Check if metric has "New" tag
	if (metric.tags?.includes('New')) {
		return true
	}
	// Check if metric route was added in the last 30 days
	if (metric.route && recentlyAddedRoutes.has(metric.route)) {
		return true
	}
	// Check if metric was added in the last 30 days (if addedAt field exists)
	if (metric.addedAt && metric.addedAt >= thirtyDaysAgo) {
		return true
	}
	return false
}

const newMetrics = [
	...defillamaPages.Metrics.filter(isNewMetric),
	...defillamaPages.Tools.filter(isNewMetric)
].map((metric) => ({
	...metric,
	name: metric.name.includes(': ') ? metric.name.split(': ')[1] : metric.name,
	description: metric.description ?? ''
}))

// Always show "New" category, even if empty
const newCategory = [{ category: 'New', metrics: newMetrics as Array<IPage> }]

export const metricsByCategory = newCategory.concat(
	Object.entries(
		defillamaPages.Metrics.filter((metric) => !isExcludedFromMetrics(metric)).reduce((acc, metric) => {
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
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

	const router = useRouter()

	const currentCategory = useMemo(() => {
		if (router.pathname === '/') return null
		return metricsByCategory.find(
			(category) =>
				category.category !== 'New' && category.metrics.some((metric) => metric.route === router.pathname)
		)?.category
	}, [router.pathname])

	const metricsInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (currentCategory && canDismiss) {
			const el = document.querySelector(`[data-category="${currentCategory}"]`)
			if (el && hasScrolledToCategoryRef.current !== `${currentCategory}-true`) {
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
			.filter((page) => page.metrics.length > 0 || page.category === 'New')
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
						onChange={(e) => setSearchValue(e.target.value)}
					/>
				</label>
			</div>
			<div className="thin-scrollbar grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				{pages.map(({ category, metrics }) => (
					<div key={category} className="relative" data-category={category}>
						<div className="absolute -top-4" />
						<div className="flex min-h-[119px] flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:min-h-[196px]">
							<Tooltip
								render={
									<BasicLink
										href={`#${category}`}
										className="text-sm font-semibold"
										onClick={(e) => {
											e.preventDefault()
											const element = document.querySelector(`[data-category="${category}"]`)
											if (element) {
												element.scrollIntoView({ behavior: 'smooth', block: 'start' })
											}
										}}
									>
										{category}
									</BasicLink>
								}
								content={`${metrics.length} metric${metrics.length !== 1 ? 's' : ''} in this category`}
							/>
							<div className="flex flex-1 flex-col gap-1 overflow-hidden">
								<p className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-form)">
									{metrics.length} metric{metrics.length !== 1 ? 's' : ''}
								</p>
								<div className="flex flex-1 flex-col gap-1 overflow-y-auto">
									{(expandedCategories.has(category) ? metrics : metrics.slice(0, 4)).map((metric) => {
										const trackedCount = totalTrackedByMetric && metric.totalTrackedKey
											? getTotalTracked(totalTrackedByMetric, metric.totalTrackedKey)
											: null
										return (
											<BasicLink
												key={`metric-${metric.name}-${metric.route}`}
												href={metric.route}
												className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-(--link-button) truncate"
											>
												<Tooltip
													content={metric.description || ''}
													placement="right-start"
													className="truncate flex items-center gap-1"
												>
													<span className="truncate flex items-center gap-1">
														{metric.name}
														{trackedCount && (
															<span className="text-(--text-tertiary) shrink-0">({trackedCount})</span>
														)}
													</span>
												</Tooltip>
												<Icon name="arrow-right" height={12} width={12} className="ml-auto shrink-0" />
											</BasicLink>
										)
									})}
									{metrics.length > 4 && !expandedCategories.has(category) && (
										<button
											onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setExpandedCategories((prev) => {
													const newSet = new Set(prev)
													newSet.add(category)
													return newSet
												})
											}}
											className="text-xs text-(--old-blue) px-1.5 py-0.5 hover:bg-(--link-button) rounded cursor-pointer text-left"
										>
											+{metrics.length - 4} more
										</button>
									)}
									{expandedCategories.has(category) && metrics.length > 4 && (
										<button
											onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setExpandedCategories((prev) => {
													const newSet = new Set(prev)
													newSet.delete(category)
													return newSet
												})
											}}
											className="text-xs text-(--old-blue) px-1.5 py-0.5 hover:bg-(--link-button) rounded cursor-pointer text-left"
										>
											Show less
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</>
	)
}

export const LinkToMetricOrToolPage = React.memo(function LinkToMetricOrToolPage({
	page,
	totalTrackedByMetric
}: {
	page: IPage
	totalTrackedByMetric: any
}) {
	const pinnedMetrics = useSyncExternalStore(
		subscribeToPinnedMetrics,
		() => localStorage.getItem('pinned-metrics') ?? '[]',
		() => '[]'
	)

	const isPinned = useMemo(() => {
		const pinnedPages = JSON.parse(pinnedMetrics)
		return pinnedPages.includes(page.route)
	}, [pinnedMetrics, page.route])

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
				className="absolute top-1 right-1 hidden rounded-md bg-(--old-blue) p-1.5 text-white group-hover:block group-data-[pinned=true]:block"
			>
				<Icon name="pin" height={14} width={14} style={{ '--icon-fill': isPinned ? 'white' : 'none' } as any} />
			</Tooltip>
		</div>
	)
})

const getTotalTracked = (totalTrackedByMetric: any, totalTrackedKey: string) => {
	const value = totalTrackedKey.split('.').reduce((obj, key) => obj?.[key], totalTrackedByMetric)
	if (!value) return null
	return `${value} tracked`
}

export const MetricsAndTools = memo(function MetricsAndTools({ currentMetric }: { currentMetric: Array<string> }) {
	const dialogStore = Ariakit.useDialogStore()
	const hasScrolledToCategoryRef = useRef('')
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
					className="dialog max-sm:drawer thin-scrollbar h-full max-h-[calc(100dvh-80px)] gap-3 sm:w-full sm:max-w-[min(85vw,1280px)]"
					unmountOnHide
					hideOnInteractOutside
				>
					<Metrics canDismiss={true} hasScrolledToCategoryRef={hasScrolledToCategoryRef} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
})
