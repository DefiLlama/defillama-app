import * as React from 'react'
import { lazy } from 'react'
import { BasicLink } from '~/components/Link'
import { Menu } from './Menu'
import { Settings } from './Settings'

const MobileSearch = lazy(() => import('~/components/Search').then((m) => ({ default: m.MobileSearch }))) as React.FC

export const MobileNav = React.memo(function MobileNav() {
	return (
		<nav className="z-10 flex items-center gap-2 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] px-4 py-3 lg:hidden">
			<BasicLink href="/" className="mr-auto shrink-0">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/defillama-press-kit/defi/PNG/defillama.png"
					alt=""
					height={36}
					width={105}
					className="mr-auto object-contain object-left"
					fetchPriority="high"
				/>
			</BasicLink>

			<React.Suspense fallback={<></>}>
				<MobileSearch />
			</React.Suspense>

			<Settings />
			<Menu />
		</nav>
	)
})
