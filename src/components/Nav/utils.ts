import defillamaPages from '~/public/pages.json'
import type { NavGroup, NavItem, NavLink } from './navStructure'

interface IPage {
	name: string
	route: string
	category?: string
	description?: string
	tags?: string[]
	tab?: string
}

// LocalStorage key for pinned metrics
export const PINNED_METRICS_KEY = 'pinned-metrics'

/**
 * Unpins a route from the navigation
 * @param route - The route to unpin
 */
export function unpinRoute(route: string) {
	const currentPinnedPages = JSON.parse(window.localStorage.getItem(PINNED_METRICS_KEY) || '[]')
	window.localStorage.setItem(
		PINNED_METRICS_KEY,
		JSON.stringify(currentPinnedPages.filter((p: string) => p !== route))
	)
	window.dispatchEvent(new Event('pinnedMetricsChange'))
}

/**
 * Groups pinned routes by their category from pages.json
 * Returns a nested NavGroup structure for consistent display
 * Performance: O(k) where k = number of pinned routes (typically <10)
 */
export function getPinnedNavStructure(pinnedRoutes: string[]): NavItem[] {
	if (!pinnedRoutes || pinnedRoutes.length === 0) return []

	// Build route lookup map - O(n) where n = total pages in pages.json
	const routeMap = new Map<string, IPage>()

	// Process all metrics from pages.json
	if (defillamaPages.Metrics && Array.isArray(defillamaPages.Metrics)) {
		for (const page of defillamaPages.Metrics) {
			routeMap.set(page.route, page as IPage)
		}
	}

	// Group pinned routes by category - O(k) where k = pinned routes
	const groupedByCategory = new Map<string, NavLink[]>()

	for (const route of pinnedRoutes) {
		const page = routeMap.get(route)
		if (!page) continue // Skip if route not found in pages.json

		const category = page.category || 'Other'

		if (!groupedByCategory.has(category)) {
			groupedByCategory.set(category, [])
		}

		groupedByCategory.get(category)!.push({
			type: 'link',
			label: page.name,
			route: page.route,
			description: page.description
		})
	}

	// Convert to NavGroup structure
	const navGroups: NavItem[] = []

	for (const [category, links] of groupedByCategory.entries()) {
		navGroups.push({
			type: 'group',
			label: category,
			defaultOpen: true, // Keep pinned groups open by default
			children: links
		} as NavGroup)
	}

	return navGroups
}
