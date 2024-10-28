import * as React from 'react'
import dynamic from 'next/dynamic'

const Desktop: any = dynamic<React.ReactNode>(() => import('./Desktop').then((m) => m.DesktopNav), {
	loading: () => (
		<nav className="flex items-center z-10 gap-2 py-3 px-4 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:h-screen lg:overflow-y-auto lg:bg-[var(--bg8)] lg:flex-col lg:gap-5 lg:p-6 lg:no-scrollbar" />
	)
})

const Mobile: any = dynamic<React.ReactNode>(() => import('./Mobile').then((m) => m.MobileNav), {
	loading: () => (
		<nav className="flex items-center z-10 gap-2 py-3 px-4 bg-[linear-gradient(168deg,#344179_3.98%,#445ed0_100%)] lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:h-screen lg:overflow-y-auto lg:bg-[var(--bg8)] lg:flex-col lg:gap-5 lg:p-6 lg:no-scrollbar" />
	)
})

export default function Nav() {
	return (
		<>
			<Mobile />
			<Desktop />
		</>
	)
}
