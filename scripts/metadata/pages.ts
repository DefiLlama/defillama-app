import fs from 'node:fs/promises'
import path from 'node:path'
import type { TastyMetricsResult } from './tastyMetrics'

type DefillamaPage = {
	category?: string
	description?: string
	keys?: unknown
	name?: string
	route: string
	tab?: unknown
	tags?: unknown
	totalTrackedKey?: unknown
	[key: string]: unknown
}

export type DefillamaPages = Record<string, DefillamaPage[]>

const TOP_CATEGORIES = [
	'Combined Metrics',
	'Total Value Locked',
	'Yields',
	'Fees & Revenue',
	'Volume',
	'Stablecoins',
	'Token'
]

export async function loadDefillamaPages(
	repoRoot: string,
	logger: Pick<Console, 'log'> = console
): Promise<DefillamaPages> {
	try {
		const fileContent = await fs.readFile(path.join(repoRoot, 'public', 'pages.json'), 'utf8')
		return JSON.parse(fileContent) as DefillamaPages
	} catch {
		logger.log('Could not load pages.json, using empty structure')
		return {
			Metrics: [],
			Tools: []
		}
	}
}

export function buildPagesWithTastyMetrics(
	defillamaPages: DefillamaPages,
	tastyMetrics: TastyMetricsResult['tastyMetrics']
): DefillamaPages {
	return {
		...defillamaPages,
		Metrics: groupAndSortByCategory(defillamaPages.Metrics ?? [], tastyMetrics),
		Tools: [...(defillamaPages.Tools ?? [])].sort((a, b) => {
			if (a.route === '/pro') return -1
			if (b.route === '/pro') return 1
			return (tastyMetrics[b.route] ?? 0) - (tastyMetrics[a.route] ?? 0)
		})
	}
}

export function buildTrendingPages(
	defillamaPages: DefillamaPages,
	trendingRoutes: TastyMetricsResult['trendingRoutes']
): DefillamaPage[] {
	return trendingRoutes
		.filter(([route]) => !isExcludedTrendingRoute(route))
		.slice(0, 5)
		.map(([route]) => {
			const pageData = findPageByRoute(defillamaPages, route)
			const name = pageData?.name ?? buildRouteLabel(route)

			return {
				name,
				route,
				category: 'Trending',
				description: pageData?.description ?? '',
				...(pageData?.totalTrackedKey ? { totalTrackedKey: pageData.totalTrackedKey } : {}),
				...(pageData?.keys ? { keys: pageData.keys } : {}),
				...(pageData?.tags ? { tags: pageData.tags } : {}),
				...(pageData?.tab ? { tab: pageData.tab } : {})
			}
		})
}

export async function writePagesAndTrendingIfNeeded(
	repoRoot: string,
	finalDefillamaPages: DefillamaPages,
	trendingPages: DefillamaPage[]
): Promise<void> {
	await fs.writeFile(path.join(repoRoot, 'public', 'pages.json'), JSON.stringify(finalDefillamaPages, null, 2))

	if (trendingPages.length === 0) {
		return
	}

	await fs.writeFile(path.join(repoRoot, 'public', 'trending.json'), JSON.stringify(trendingPages, null, 2))
}

function isExcludedTrendingRoute(route: string): boolean {
	if (route === '/pro' || route.startsWith('/pro/')) {
		return true
	}
	return ['/chain/', '/metrics', '/tools', '/subscription'].some((page) => route.includes(page))
}

function buildRouteLabel(route: string): string {
	const parts = route.split('/').filter(Boolean)
	if (parts.length === 0) return route
	if (parts.length === 1) return capitalize(parts[0] ?? '')

	const prefix = parts
		.slice(0, -1)
		.map((part) => capitalize(part))
		.join(' ')
	return `${prefix}: ${capitalize(parts[parts.length - 1] ?? '')}`
}

function groupAndSortByCategory(items: DefillamaPage[], tastyMetrics: Record<string, number>): DefillamaPage[] {
	const grouped: Record<string, number> = {}
	for (const item of items) {
		const category = item.category || 'Others'
		grouped[category] = (grouped[category] ?? 0) + (tastyMetrics[item.route] ?? 0)
	}

	const otherCategories = Object.entries(grouped)
		.filter(([category]) => !TOP_CATEGORIES.includes(category) && category !== 'Others')
		.sort((a, b) => b[1] - a[1])
		.map(([category]) => category)

	const pagesByGroup: DefillamaPage[] = []
	for (const categoryName of [...TOP_CATEGORIES, ...otherCategories, 'Others']) {
		const pages = items
			.filter((item) => (item.category || 'Others') === categoryName)
			.sort((a, b) => (tastyMetrics[b.route] ?? 0) - (tastyMetrics[a.route] ?? 0))
			.map(({ name, route, category: pageCategory, description, ...others }) => ({
				name,
				route,
				category: pageCategory ?? 'Others',
				description: description ?? '',
				...others
			}))
		pagesByGroup.push(...pages)
	}

	return pagesByGroup
}

function findPageByRoute(defillamaPages: DefillamaPages, route: string): DefillamaPage | null {
	for (const category in defillamaPages) {
		for (const page of defillamaPages[category]) {
			if (page.route === route) {
				return page
			}
		}
	}
	return null
}

const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)
