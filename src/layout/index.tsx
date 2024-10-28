import * as React from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import ThemeProvider, { GlobalStyle } from '~/Theme'
import SEO from '~/components/SEO'
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
	fullWidth?: boolean
}

export default function Layout({ title, children, defaultSEO = false, ...props }: ILayoutProps) {
	const isClient = useIsClient()
	return (
		<>
			<Head>
				<title>{title}</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>

			{defaultSEO ? <SEO /> : null}

			<ThemeProvider>
				{/* @ts-ignore */}
				<GlobalStyle />
				<Nav />
				<div
					{...props}
					data-fullwidth={props.fullWidth ?? false}
					className="flex flex-col m-4 isolate lg:m-7 lg:ml-[248px] w-full data-[fullwidth=true]:w-[calc(100vw-258px)]"
				>
					<main
						{...props}
						className="flex flex-col gap-7 w-full max-w-[140rem] min-h-full mx-auto text-[var(--text1)] flex-1"
					>
						{children}
					</main>
				</div>

				{isClient ? <Toaster /> : null}
			</ThemeProvider>
		</>
	)
}
