import { lazy, memo, Suspense, useMemo, useSyncExternalStore } from 'react'
import { useDashboardAPI } from '~/containers/ProDashboard/hooks'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { subscribeToPinnedMetrics, WALLET_LINK_MODAL } from '~/contexts/LocalStorage'
import { BasicLink } from '../Link'
import { DesktopNav } from './Desktop'
import type { NavLink } from './navStructure'
import { PINNED_METRICS_KEY } from './utils'

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

function NavComponent() {
	const { dashboards } = useDashboardAPI()
	const { user, isAuthenticated } = useAuthContext()

	const hasEthWallet = Boolean(user?.walletAddress)
	const hasSeenWalletPrompt =
		typeof window !== 'undefined' && window?.localStorage?.getItem(WALLET_LINK_MODAL) === 'true'

	const showAttentionIcon = isAuthenticated && !hasEthWallet && !hasSeenWalletPrompt

	const userDashboards = useMemo<NavLink[]>(
		() =>
			dashboards?.map(({ id, data }) => ({
				type: 'link',
				label: data.dashboardName,
				route: `/pro/${id}`
			})) ?? [],
		[dashboards]
	)

	const pinnedMetrics = useSyncExternalStore(
		subscribeToPinnedMetrics,
		() => localStorage.getItem(PINNED_METRICS_KEY) ?? '[]',
		() => '[]'
	)

	const pinnedPages = useMemo<string[]>(() => {
		if (!pinnedMetrics) return []

		const parsedMetrics = JSON.parse(pinnedMetrics)
		if (!Array.isArray(parsedMetrics) || parsedMetrics.length === 0) return []

		// Return raw pinned routes array for grouped structure
		return parsedMetrics
	}, [pinnedMetrics])

	return (
		<>
			<DesktopNav pinnedPages={pinnedPages} userDashboards={userDashboards} accountAttention={showAttentionIcon} />
			<Suspense fallback={<MobileFallback />}>
				<MobileNav pinnedPages={pinnedPages} userDashboards={userDashboards} accountAttention={showAttentionIcon} />
			</Suspense>
		</>
	)
}

export const Nav = memo(NavComponent)
