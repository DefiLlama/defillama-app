import { useMemo, useSyncExternalStore } from 'react'
import { useDashboardAPI } from '~/containers/ProDashboard/hooks'
import { subscribeToPinnedMetrics } from '~/contexts/LocalStorage'
import defillamaPages from '~/public/pages.json'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'
import { TNavLinks } from './types'

const otherMainPages = [
	{ name: 'Pricing', route: '/subscription', icon: 'banknote' },
	{ name: 'Custom Dashboards', route: '/pro', icon: 'blocks' }
]
const mainLinks = [{ category: 'Main', pages: defillamaPages['Main'].concat(otherMainPages) }]
const footerLinks = ['More', 'About Us'].map((category) => ({
	category,
	pages: defillamaPages[category]
})) as TNavLinks

export default function Nav() {
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
			<MobileNav
				mainLinks={mainLinks}
				pinnedPages={pinnedPages}
				userDashboards={userDashboards}
				footerLinks={footerLinks}
			/>
		</>
	)
}
