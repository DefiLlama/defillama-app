import * as React from 'react'
import Link from 'next/link'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { DesktopNav } from './Desktop'
import { MobileNav } from './Mobile'

const Fallback = () => {
	const [darkMode] = useDarkModeManager()

	return (
		<nav className="flex items-center z-10 gap-2 py-3 px-4 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:h-screen lg:overflow-y-auto lg:bg-[var(--bg8)] lg:flex-col lg:gap-5 lg:p-6 lg:no-scrollbar lg:bg-none">
			<Link href="/" passHref>
				<a className="flex-shrink-0">
					<span className="sr-only">Navigate to Home Page</span>
					<img
						src={
							darkMode
								? '/defillama-press-kit/defi/PNG/defillama.png'
								: '/defillama-press-kit/defi/PNG/defillama-dark.png'
						}
						height={53}
						width={155}
						className="object-contain object-left mr-auto mb-4 hidden lg:block"
						alt=""
					/>
					<img
						src="/defillama-press-kit/defi/PNG/defillama.png"
						height={36}
						width={105}
						className="object-contain object-left mr-auto mb-4 block lg:hidden"
						alt=""
					/>
				</a>
			</Link>
		</nav>
	)
}

// const Desktop: any = React.lazy(() => import('./Desktop').then((m) => ({ default: m.DesktopNav })))

// const Mobile: any = React.lazy(() => import('./Mobile').then((m) => ({ default: m.MobileNav })))

// export default function Nav() {
// 	return (
// 		<>
// 			<React.Suspense fallback={<Fallback />}>
// 				<Desktop />
// 			</React.Suspense>
// 			<React.Suspense fallback={<Fallback />}>
// 				<Mobile />
// 			</React.Suspense>
// 		</>
// 	)
// }

export default function Nav() {
	return (
		<>
			<DesktopNav />
			<MobileNav />
		</>
	)
}
