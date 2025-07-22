import * as React from 'react'
import Head from 'next/head'
import { SEO } from '~/components/SEO'
import Nav from '~/components/Nav'
import { useIsClient } from '~/hooks'

const Toaster = React.lazy(() => import('~/components/Toast').then((m) => ({ default: m.Toast })))

interface ILayoutProps {
	title: string
	children: React.ReactNode
	defaultSEO?: boolean
	backgroundColor?: string
	className?: string
	style?: React.CSSProperties
}

export default function Layout({
	title,
	children,
	defaultSEO = false,
	backgroundColor,
	className,
	...props
}: ILayoutProps) {
	const isClient = useIsClient()
	return (
		<>
			<Head>
				<title>{title}</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>

			{defaultSEO ? <SEO /> : null}
			<Nav />
			<main
				{...props}
				className={`flex flex-col gap-2 text-(--text1) isolate p-1 lg:p-4 lg:pl-[248px] min-h-screen lg:w-screen ${
					className ?? ''
				}`}
			>
				{children}
			</main>
			{isClient ? (
				<React.Suspense>
					<Toaster />
				</React.Suspense>
			) : null}
		</>
	)
}

// sidebar + gap between nav & main + padding right
// 228px + 4px + 16px = 248px
