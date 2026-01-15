import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import '~/tailwind.css'
import '~/nprogress.css'
import Script from 'next/script'
import NProgress from 'nprogress'
import { useEffect } from 'react'
import { UserSettingsSync } from '~/components/UserSettingsSync'
import { AuthProvider, useUserHash } from '~/containers/Subscribtion/auth'

NProgress.configure({ showSpinner: false })

const client = new QueryClient()

function App({ Component, pageProps }: AppProps) {
	const router = useRouter()

	useEffect(() => {
		const handleRouteChange = () => {
			NProgress.start()
		}

		router.events.on('routeChangeStart', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			router.events.off('routeChangeStart', handleRouteChange)
		}
	}, [router])

	useEffect(() => {
		const handleRouteChange = () => {
			NProgress.done()
		}

		router.events.on('routeChangeComplete', handleRouteChange)

		// If the component is unmounted, unsubscribe
		// from the event with the `off` method:
		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [router])

	// Scroll restoration for complete route changes (not shallow)
	useEffect(() => {
		const handleRouteChange = (url: string, { shallow }: { shallow: boolean }) => {
			// Only restore scroll for complete route changes, not shallow ones
			if (!shallow && typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' })
			}
		}

		router.events.on('routeChangeComplete', handleRouteChange)

		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
		}
	}, [router])

	const { userHash, email } = useUserHash()

	return (
		<>
			<Head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
			</Head>
			{/* Analytics script - loaded after page becomes interactive to reduce TBT */}
			<Script
				src="/script2.js"
				strategy="afterInteractive"
				data-website-id="ca346731-f7ec-437f-9727-162f29bb67ae"
				data-host-url="https://tasty.defillama.com"
			/>

			{userHash &&
			typeof window !== 'undefined' &&
			!(window as any).FrontChat &&
			window.innerWidth > 768 &&
			// hide support icon on ai chat page because it can block the dialog button
			!router.pathname.includes('/ai/chat') ? (
				<Script
					src="/assets/front-chat.js"
					strategy="afterInteractive"
					onLoad={() => {
						if (typeof window !== 'undefined' && (window as any).FrontChat) {
							;(window as any).FrontChat('init', {
								chatId: '6fec3ab74da2261df3f3748a50dd3d6a',
								useDefaultLauncher: true,
								email,
								userHash
							})
						}
					}}
				/>
			) : null}

			<Component {...pageProps} />
		</>
	)
}

const AppWrapper = (props: AppProps) => {
	return (
		<>
			<QueryClientProvider client={client}>
				<AuthProvider>
					<UserSettingsSync />
					<App {...props} />
				</AuthProvider>
				<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
			</QueryClientProvider>
		</>
	)
}

export default AppWrapper
