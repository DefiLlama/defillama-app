import * as React from 'react'
import Head from 'next/head'
import { SEO } from '~/components/SEO'
import Nav from '~/components/Nav'
import { useIsClient } from '~/hooks'
import { AuthProvider } from '~/containers/Subscribtion/auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from './WalletProvider'

const Toaster = React.lazy(() => import('~/components/Toast').then((m) => ({ default: m.Toast })))

interface ILayoutProps {
	title: string
	children: React.ReactNode
	defaultSEO?: boolean
	backgroundColor?: string
	className?: string
	style?: React.CSSProperties
}

const queryClient = new QueryClient()

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
			<WalletProvider>
				<QueryClientProvider client={queryClient}>
					<AuthProvider>
						<main
							{...props}
							className={`flex flex-col gap-1 text-[var(--text1)] isolate p-1 lg:p-4 lg:pl-[248px] min-h-screen w-[100vw]${
								className ?? ''
							}`}
						>
							{children}
						</main>
					</AuthProvider>
				</QueryClientProvider>
			</WalletProvider>
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
