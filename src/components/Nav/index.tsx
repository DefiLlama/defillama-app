import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useStorageItem } from '~/contexts/localStorageStore'
import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import type { TNavLinks, TOldNavLink } from './types'

const footerCategories = ['More', 'About Us'] as const
const footerLinks = footerCategories.map((category) => ({
	category,
	pages: defillamaPages[category] ?? []
})) as TNavLinks

const routeToPageMap = new Map<string, { name: string; route: string }>()
for (const pages of Object.values(defillamaPages as Record<string, Array<{ name: string; route: string }>>)) {
	for (const page of pages) {
		routeToPageMap.set(page.route, page)
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

function NavComponent({ metricFilters }: { metricFilters?: { name: string; key: string }[] }) {
	const { asPath } = useRouter()
	const { data: liteDashboards } = useGetLiteDashboards()

	const { hasActiveSubscription } = useAuthContext()

	const mainLinks = useMemo(() => {
		const otherMainPages = [
			{ name: 'Chains', route: '/chains', icon: 'globe' },
			{ name: 'Yields', route: '/yields', icon: 'percent' },
			{ name: 'Stablecoins', route: '/stablecoins', icon: 'dollar-sign' },
			{ name: 'RWA', route: '/rwa', icon: 'banknote', isNew: true },
			{ name: 'Support', route: '/support', icon: 'headset' },
			{ name: 'API', route: 'https://api-docs.defillama.com', icon: 'code' }
		]
		const premiumPages = [
			{ name: 'Pricing', route: '/subscription', icon: 'user' },
			{ name: 'LlamaAI', route: hasActiveSubscription ? '/ai/chat' : '/ai', icon: '' },
			{ name: 'Custom Dashboards', route: '/pro', icon: 'blocks' },
			{ name: 'Sheets', route: '/sheets', icon: 'sheets' },
			{ name: 'LlamaFeed', route: 'https://llamafeed.io', icon: 'activity', umamiEvent: 'nav-llamafeed-click' }
		]
		return [
			{ category: 'Main', pages: defillamaPages['Main'].concat(otherMainPages) },
			{ category: 'Premium', pages: premiumPages }
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

export const Nav = NavComponent
