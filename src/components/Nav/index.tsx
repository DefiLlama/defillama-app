import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useDarkModeManager } from '~/contexts/LocalStorage'

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
								? '/defillama-press-kit/defi/SVG/defillama.svg'
								: '/defillama-press-kit/defi/SVG/defillama-dark.svg'
						}
						height={53}
						width={155}
						className="object-contain object-left mr-auto mb-4 hidden lg:block"
						alt=""
					/>
					<img
						src="/defillama-press-kit/defi/SVG/defillama.svg"
						height={53}
						width={155}
						className="object-contain object-left mr-auto mb-4 lg:hidden"
						alt=""
					/>
				</a>
			</Link>
		</nav>
	)
}

const Desktop: any = dynamic<React.ReactNode>(() => import('./Desktop').then((m) => m.DesktopNav), {
	loading: () => <Fallback />
})

const Mobile: any = dynamic<React.ReactNode>(() => import('./Mobile').then((m) => m.MobileNav), {
	loading: () => <Fallback />
})

export default function Nav() {
	return (
		<>
			<Desktop />
			<Mobile />
		</>
	)
}
