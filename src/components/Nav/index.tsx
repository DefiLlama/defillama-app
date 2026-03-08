import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { isIconName } from '~/components/Icon'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useStorageItem } from '~/contexts/localStorageStore'
import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import type { TNavLink, TNavLinks, TOldNavLink } from './types'

function normalizeNavPage(page: {
	name: string
	route: string
	icon?: unknown
	isNew?: boolean
	umamiEvent?: string
}): TNavLink {
	return {
		name: page.name,
		route: page.route,
		...(isIconName(page.icon) ? { icon: page.icon } : {}),
		...(page.isNew ? { isNew: page.isNew } : {}),
		...(page.umamiEvent ? { umamiEvent: page.umamiEvent } : {})
	}
}

const mainPages = (defillamaPages['Main'] ?? []).map(normalizeNavPage)
const premiumPages = (defillamaPages['Premium'] ?? []).map(normalizeNavPage)

const footerCategories = ['More', 'About Us'] as const
const footerLinks = footerCategories.map((category) => ({
	category,
	pages: defillamaPages[category] ?? []
})) as TNavLinks

const routeToPageMap = new Map<string, { name: string; route: string }>()
for (const [category, pages] of Object.entries(
	defillamaPages as Record<string, Array<{ name: string; route: string }>>
)) {
	if (category === 'Hidden') continue
	for (const page of pages) {
		if (!routeToPageMap.has(page.route)) {
			routeToPageMap.set(page.route, { name: page.name, route: page.route })
		}
	}
}

const oldMetricLinks: Array<TOldNavLink> = Object.values(
	[...defillamaPages['Metrics'], ...defillamaPages['Tools']].reduce<Record<string, TOldNavLink>>((acc, curr) => {
		if (curr.oldCategory) {
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

export function Nav({ metricFilters }: { metricFilters?: { name: string; key: string }[] }) {
	const { asPath } = useRouter()
	const { data: liteDashboards } = useGetLiteDashboards()

	const { hasActiveSubscription } = useAuthContext()

	const mainLinks = useMemo(() => {
		const premium = premiumPages.map((p) =>
			p.route === '/ai' && hasActiveSubscription ? { ...p, route: '/ai/chat' } : p
		)
		return [
			{ category: 'Main', pages: mainPages },
			{ category: 'Premium', pages: premium }
		]
	}, [hasActiveSubscription])

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
		if (!pinnedMetrics) return []
		try {
			const parsed = JSON.parse(pinnedMetrics)
			if (!Array.isArray(parsed) || parsed.length === 0) return []
			return parsed.flatMap((metric: string) => {
				const page = routeToPageMap.get(metric)
				return page ? [page] : []
			})
		} catch {
			return []
		}
	}, [pinnedMetrics])

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
