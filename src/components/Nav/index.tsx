import { lazy, memo, Suspense, useMemo, useSyncExternalStore } from 'react'
import { useDashboardAPI } from '~/containers/ProDashboard/hooks'
import { subscribeToPinnedMetrics } from '~/contexts/LocalStorage'
import defillamaPages from '~/public/pages.json'
import { BasicLink } from '../Link'
import { DesktopNav } from './Desktop'
import { TNavLinks } from './types'

const MobileNav = lazy(() => import('./Mobile').then((m) => ({ default: m.MobileNav })))
const MobileFallback = () => {
	return (
		<nav className="z-10 flex items-center gap-2 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] px-4 py-3 lg:hidden">
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

const otherMainPages = [
	{ name: 'Pricing', route: '/subscription', icon: 'banknote' },
	{ name: 'Custom Dashboards', route: '/pro', icon: 'blocks' }
]
const mainLinks = [{ category: 'Main', pages: defillamaPages['Main'].concat(otherMainPages) }]
const footerLinks = ['More', 'About Us'].map((category) => ({
	category,
	pages: defillamaPages[category]
})) as TNavLinks

function NavComponent() {
	const { dashboards } = useDashboardAPI()
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
		return JSON.parse(pinnedMetrics)
			.map((metric: string) => {
				let pageData = null
				for (const category in defillamaPages) {
					const pages = defillamaPages[category]
					for (const page of pages) {
						if (page.route === metric) {
							pageData = page
							break
						}
					}
				}
				return pageData ? { name: pageData.name, route: pageData.route } : null
			})
			.filter((page) => page !== null)
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
