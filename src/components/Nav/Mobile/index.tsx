import { BasicLink } from '~/components/Link'
import { MobileSearch } from '~/components/Search'
import type { TNavLink, TNavLinks, TOldNavLink } from '../types'
import { Menu } from './Menu'
import { Settings } from './Settings'

export const MobileNav = ({
	mainLinks,
	pinnedPages,
	userDashboards,
	footerLinks,
	metricFilters,
	oldMetricLinks,
	asPath
}: {
	mainLinks: TNavLinks
	pinnedPages: Array<TNavLink>
	userDashboards: Array<TNavLink>
	footerLinks: TNavLinks
	metricFilters?: { name: string; key: string }[]
	oldMetricLinks: Array<TOldNavLink>
	asPath: string
}) => {
	return (
		<nav className="col-span-full flex items-center gap-2 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] px-4 py-3 lg:hidden">
			<BasicLink href="/" className="mr-auto shrink-0">
				<span className="sr-only">Navigate to DeFi Dashboard</span>
				<img
					src="/assets/defillama.webp"
					alt=""
					height={36}
					width={105}
					className="mr-auto object-contain object-left"
					fetchPriority="high"
					loading="eager"
					decoding="sync"
				/>
			</BasicLink>

			<MobileSearch />

			<Settings metricFilters={metricFilters} />

			<Menu
				mainLinks={mainLinks}
				pinnedPages={pinnedPages}
				userDashboards={userDashboards}
				footerLinks={footerLinks}
				oldMetricLinks={oldMetricLinks}
				asPath={asPath}
			/>
		</nav>
	)
}
