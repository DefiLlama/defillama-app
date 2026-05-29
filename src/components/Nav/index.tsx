import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useStorageItem } from '~/contexts/localStorageStore'
import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import type { TNavLink, TNavLinks, TOldNavLink } from './types'

type DefillamaPage = {
	name: string
	route: string
	icon?: TNavLink['icon']
	isNew?: boolean
	umamiEvent?: string
	oldCategory?: string
	oldName?: string
	requireLlama?: boolean
}

type DefillamaPages = Record<string, DefillamaPage[]> & {
	Main?: TNavLink[]
	Premium?: TNavLink[]
	Metrics: DefillamaPage[]
	Tools: DefillamaPage[]
	Hidden?: Array<Pick<DefillamaPage, 'name' | 'route'>>
}

const pages = defillamaPages as DefillamaPages

const mainPages = pages.Main ?? []
const premiumPages = pages.Premium ?? []

const footerCategories = ['More', 'About Us'] as const
const footerLinks = footerCategories.map((category) => ({
	category,
	pages: (pages[category] ?? []) as TNavLink[]
})) as TNavLinks

// Skip "Hidden" so hidden page names (e.g. "Subscribe to DefiLlama") don't overwrite
// visible labels, and first-match-wins prevents later duplicates from replacing earlier ones.
const routeToPageMap = new Map<string, DefillamaPage>()
for (const [category, categoryPages] of Object.entries(pages)) {
	if (category === 'Hidden') continue
	for (const page of categoryPages) {
		if (!routeToPageMap.has(page.route)) {
			routeToPageMap.set(page.route, page)
		}
	}
}

const oldMetricLinks: Array<TOldNavLink> = Object.values(
	[...pages.Metrics, ...pages.Tools].reduce<Record<string, TOldNavLink>>((acc, curr) => {
		if (curr.oldCategory && curr.oldName) {
			acc[curr.oldCategory] = acc[curr.oldCategory] || { name: curr.oldCategory, pages: [] }
			const groupedMetric = acc[curr.oldCategory]
			if (!groupedMetric.pages) {
				groupedMetric.pages = []
			}
			groupedMetric.pages.push({ name: curr.oldName, route: curr.route })
		}
		if (curr.oldName && !curr.oldCategory) {
			acc[curr.oldName] = acc[curr.oldName] || { name: curr.oldName, route: curr.route }
		}
		return acc
	}, {})
)

function normalizeAiRoute(route: string, shouldSkipLanding: boolean): string {
	return route === '/ai' && shouldSkipLanding ? '/ai/chat' : route
}

function canonicalAiRoute(route: string): string {
	return route === '/ai/chat' ? '/ai' : route
}

function parsePinnedMetrics(value: string): string[] {
	try {
		const parsed = JSON.parse(value)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export function Nav({ metricFilters }: { metricFilters?: { name: string; key: string }[] }) {
	const { asPath } = useRouter()
	const { data: liteDashboards } = useGetLiteDashboards()

	const { isAuthenticated, user } = useAuthContext()
	const shouldSkipLanding = isAuthenticated
	const isLlamaUser = user?.flags?.is_llama === true

	const mainLinks = useMemo(() => {
		const main = mainPages.filter((p) => !p.requireLlama || isLlamaUser)
		const premium = premiumPages
			.filter((p) => !p.requireLlama || isLlamaUser)
			.map((p) => {
				const route = normalizeAiRoute(p.route, shouldSkipLanding)
				return route !== p.route ? { ...p, route } : p
			})
		return [
			{ category: 'Main', pages: main },
			{ category: 'Premium', pages: premium }
		]
	}, [shouldSkipLanding, isLlamaUser])

	const userDashboards = useMemo(
		() =>
			liteDashboards?.map((dashboard: { id: string; name: string }) => ({
				name: dashboard.name,
				route: `/pro/${dashboard.id}`
			})) ?? [],
		[liteDashboards]
	)
	const pinnedMetrics = useStorageItem('pinned-metrics', '[]')

	const pinnedPages = useMemo(() => {
		const parsed = pinnedMetrics ? parsePinnedMetrics(pinnedMetrics) : []
		if (parsed.length === 0) return []

		return parsed.flatMap((metric: string) => {
			const page = routeToPageMap.get(metric) ?? routeToPageMap.get(canonicalAiRoute(metric))
			if (!page) return []
			const route = normalizeAiRoute(page.route, shouldSkipLanding)
			return [route !== page.route ? { ...page, route } : page]
		})
	}, [pinnedMetrics, shouldSkipLanding])

	return (
		<>
			<DesktopNav
				mainLinks={mainLinks}
				pinnedPages={pinnedPages}
				userDashboards={userDashboards}
				footerLinks={footerLinks}
				oldMetricLinks={oldMetricLinks}
				asPath={asPath}
			/>
			<MobileNav
				mainLinks={mainLinks}
				pinnedPages={pinnedPages}
				userDashboards={userDashboards}
				footerLinks={footerLinks}
				metricFilters={metricFilters}
				oldMetricLinks={oldMetricLinks}
				asPath={asPath}
			/>
		</>
	)
}
