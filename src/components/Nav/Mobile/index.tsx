import * as React from 'react'
import { useRouter } from 'next/router'
import { Menu } from './Menu'
import { Settings } from './Settings'
import { BasicLink } from '~/components/Link'
import { lazy } from 'react'

const MobileSearch = lazy(() =>
	import('~/components/Search/Base/Mobile').then((m) => ({ default: m.MobileSearch }))
) as React.FC

export const MobileNav = React.memo(function MobileNav() {
	const router = useRouter()

	return (
		<nav className="flex items-center z-10 gap-2 py-3 px-4 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] lg:hidden">
			<BasicLink href="/" className="shrink-0 mr-auto">
				<span className="sr-only">Navigate to Home Page</span>
				<img
					src="/defillama-press-kit/defi/PNG/defillama.png"
					alt=""
					height={36}
					width={105}
					className="object-contain object-left mr-auto"
					fetchPriority="high"
				/>
			</BasicLink>

			{!router.pathname.startsWith('/yield') && !router.pathname.startsWith('/raises') ? (
				<React.Suspense fallback={<></>}>
					<MobileSearch />
				</React.Suspense>
			) : null}
			<Settings />
			<Menu />
		</nav>
	)
})
