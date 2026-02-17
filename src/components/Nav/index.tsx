import { lazy, Suspense, useMemo, useSyncExternalStore } from 'react'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { getStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
import defillamaPages from '~/public/pages.json'
import { BasicLink } from '../Link'
import { DesktopNav } from './Desktop'
import type { TNavLinks, TOldNavLink } from './types'

const MobileNav = lazy(() => import('./Mobile').then((m) => ({ default: m.MobileNav })))
const MobileFallback = () => {
	return (
		<nav className="col-span-full flex items-center gap-2 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] px-4 py-3 lg:hidden">
			<BasicLink href="/" className="mr-auto shrink-0">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/assets/defillama.webp"
					alt=""
					height={36}
					width={105}
					className="mr-auto object-contain object-left"
					fetchPriority="high"
				/>
			</BasicLink>
		</nav>
	)
}

const footerCategories = ['More', 'About Us'] as const
const footerLinks = footerCategories.map((category) => ({
	category,
	pages: defillamaPages[category] ?? []
})) as TNavLinks

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
	const pinnedMetrics = useSyncExternalStore(
		(callback) => subscribeToStorageKey('pinned-metrics', callback),
		() => getStorageItem('pinned-metrics', '[]') ?? '[]',
		() => '[]'
	)

	const pinnedPages = useMemo(() => {
		if (!pinnedMetrics) return []

		const parsedMetrics = JSON.parse(pinnedMetrics)
		if (!Array.isArray(parsedMetrics) || parsedMetrics.length === 0) return []

		// Create a lookup map for faster access
		const routeToPageMap = new Map<string, { name: string; route: string }>()
		for (const [, pages] of Object.entries(defillamaPages as Record<string, Array<{ name: string; route: string }>>)) {
			for (const page of pages) {
				routeToPageMap.set(page.route, { name: page.name, route: page.route })
			}
		}

		return parsedMetrics.flatMap((metric: string) => {
			const page = routeToPageMap.get(metric)
			return page ? [page] : []
		})
	}, [pinnedMetrics])

	return (
		<>
			<DesktopNav
				mainLinks={mainLinks}
				pinnedPages={pinnedPages}
				userDashboards={userDashboards}
				footerLinks={footerLinks}
				oldMetricLinks={oldMetricLinks}
			/>
			<Suspense fallback={<MobileFallback />}>
				<MobileNav
					mainLinks={mainLinks}
					pinnedPages={pinnedPages}
					userDashboards={userDashboards}
					footerLinks={footerLinks}
					metricFilters={metricFilters}
					oldMetricLinks={oldMetricLinks}
				/>
			</Suspense>
		</>
	)
}

export const Nav = NavComponent
