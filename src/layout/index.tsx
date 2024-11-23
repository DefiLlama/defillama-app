import * as React from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { SEO } from '~/components/SEO'
import Nav from '~/components/Nav'
import { useIsClient } from '~/hooks'

const Toaster = dynamic(() => import('~/components/Toast').then((m) => m.Toast), {
	ssr: false
})

interface ILayoutProps {
	title: string
	children: React.ReactNode
	defaultSEO?: boolean
	backgroundColor?: string
	style?: React.CSSProperties
}

export default function Layout({ title, children, defaultSEO = false, backgroundColor, ...props }: ILayoutProps) {
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
				className="flex flex-col gap-7 w-full min-h-full text-[var(--text1)] isolate p-4 lg:p-7 lg:pl-[248px]"
			>
				{children}
			</main>
			{isClient ? <Toaster /> : null}
		</>
	)
}
