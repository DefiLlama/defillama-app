import { lazy, memo, Suspense, useMemo, useSyncExternalStore } from 'react'
import { useGetLiteDashboards } from '~/containers/ProDashboard/hooks/useDashboardAPI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { subscribeToPinnedMetrics, WALLET_LINK_MODAL } from '~/contexts/LocalStorage'
import defillamaPages from '~/public/pages.json'
import { BasicLink } from '../Link'
import { DesktopNav } from './Desktop'
import { TNavLinks, TOldNavLink } from './types'

const MobileNav = lazy(() => import('./Mobile').then((m) => ({ default: m.MobileNav })))
const MobileFallback = () => {
	return (
		<nav className="col-span-full flex items-center gap-2 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] px-4 py-3 lg:hidden">
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

const oldMetricLinks: Array<TOldNavLink> = Object.values(
	[...defillamaPages['Metrics'], ...defillamaPages['Tools']].reduce((acc, curr) => {
		if (curr.oldCategory) {
			acc[curr.oldCategory] = acc[curr.oldCategory] || { name: curr.oldCategory, pages: [] }
			acc[curr.oldCategory].pages.push({ name: curr.oldName, route: curr.route })
		}
		if (curr.oldName && !curr.oldCategory) {
			acc[curr.oldName] = acc[curr.oldName] || { name: curr.oldName, route: curr.route }
		}
		return acc
	}, {})
)

function NavComponent({ metricFilters }: { metricFilters?: { name: string; key: string }[] }) {
	const { data: liteDashboards } = useGetLiteDashboards()

	const { user, isAuthenticated, hasActiveSubscription } = useAuthContext()

	const hasEthWallet = Boolean(user?.walletAddress)
	const hasSeenWalletPrompt =
		typeof window !== 'undefined' && window?.localStorage?.getItem(WALLET_LINK_MODAL) === 'true'

	const showAttentionIcon = isAuthenticated && !hasEthWallet && !hasSeenWalletPrompt

	const mainLinks = useMemo(() => {
		const otherMainPages = [
			{ name: 'Pricing', route: '/subscription', icon: 'user', attention: showAttentionIcon },
			{ name: 'Custom Dashboards', route: '/pro', icon: 'blocks' },
			...(hasActiveSubscription
				? [{ name: 'LlamaAI', route: '/ai/chat', icon: '' }]
				: [{ name: 'LlamaAI', route: '/ai', icon: '' }]),
			{ name: 'Support', route: '/support', icon: 'support' }
		]
		return [{ category: 'Main', pages: defillamaPages['Main'].concat(otherMainPages) }]
	}, [showAttentionIcon, hasActiveSubscription])

	const userDashboards = useMemo(
		() => liteDashboards?.map(({ id, name }) => ({ name, route: `/pro/${id}` })) ?? [],
		[liteDashboards]
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

export const Nav = memo(NavComponent)
