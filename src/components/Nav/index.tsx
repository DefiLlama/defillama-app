import { lazy, memo, Suspense, useMemo, useSyncExternalStore } from 'react'
import { useDashboardAPI } from '~/containers/ProDashboard/hooks'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { subscribeToPinnedMetrics } from '~/contexts/LocalStorage'
import { useSubscribe } from '~/hooks/useSubscribe'
import defillamaPages from '~/public/pages.json'
import { BasicLink } from '../Link'
import { DesktopNav } from './Desktop'
import { TNavLinks } from './types'

const MobileNav = lazy(() => import('./Mobile').then((m) => ({ default: m.MobileNav })))
const MobileFallback = () => {
	return (
		<nav className="flex items-center gap-2 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] px-4 py-3 lg:hidden">
			<BasicLink href="/" className="mr-auto shrink-0">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/icons/defillama.webp"
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

const footerLinks = ['More', 'About Us'].map((category) => ({
	category,
	pages: defillamaPages[category]
})) as TNavLinks

function NavComponent() {
	const { dashboards } = useDashboardAPI()
	const { isAuthenticated, user } = useAuthContext()
	const { hasActiveSubscription } = useSubscribe()

	const hasEthWallet = Boolean(user?.walletAddress)
	const showAttentionIcon = isAuthenticated && hasActiveSubscription && !hasEthWallet

	const mainLinks = useMemo(() => {
		const otherMainPages = [
			{ name: 'Pricing', route: '/subscription', icon: 'banknote', attention: showAttentionIcon },
			{ name: 'Custom Dashboards', route: '/pro', icon: 'ethereum' }
		]
		return [{ category: 'Main', pages: defillamaPages['Main'].concat(otherMainPages) }]
	}, [showAttentionIcon])

	const userDashboards = useMemo(
		() => dashboards?.map(({ id, data }) => ({ name: data.dashboardName, route: `/pro/${id}` })) ?? [],
		[dashboards]
	)
	const pinnedMetrics = useSyncExternalStore(
		subscribeToPinnedMetrics,
		() => localStorage.getItem('pinned-metrics') ?? '[]',
		() => '[]'
	)

	const pinnedPages = useMemo(() => {
		if (!pinnedMetrics) return []

		const parsedMetrics = JSON.parse(pinnedMetrics)
		if (!Array.isArray(parsedMetrics) || parsedMetrics.length === 0) return []

		// Create a lookup map for faster access
		const routeToPageMap = new Map()
		for (const category in defillamaPages) {
			const pages = defillamaPages[category]
			for (const page of pages) {
				routeToPageMap.set(page.route, { name: page.name, route: page.route })
			}
		}

		return parsedMetrics.map((metric: string) => routeToPageMap.get(metric)).filter((page) => page !== undefined)
	}, [pinnedMetrics])

	return (
		<>
			<DesktopNav
				mainLinks={mainLinks}
				pinnedPages={pinnedPages}
				userDashboards={userDashboards}
				footerLinks={footerLinks}
			/>
			<Suspense fallback={<MobileFallback />}>
				<MobileNav
					mainLinks={mainLinks}
					pinnedPages={pinnedPages}
					userDashboards={userDashboards}
					footerLinks={footerLinks}
				/>
			</Suspense>
		</>
	)
}

export const Nav = memo(NavComponent)
