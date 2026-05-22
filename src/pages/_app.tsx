import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Router from 'next/router'
import Script from 'next/script'
import '@rainbow-me/rainbowkit/styles.css'
import '~/tailwind.css'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { RouteProgressIndicator } from '~/components/RouteProgressIndicator'
import { UserSettingsSync } from '~/components/UserSettingsSync'
import { AuthProvider } from '~/containers/Subscription/auth'
import { useAuthBridge } from '~/hooks/useAuthBridge'
import { useParentAuthTracker } from '~/hooks/useParentAuthTracker'
import { useReferrer } from '~/hooks/useReferrer'
import { useUmamiIdentityTracker } from '~/hooks/useUmamiIdentityTracker'

type NextPageWithLayout = AppProps['Component'] & {
	getLayout?: (page: ReactElement) => ReactElement
}

type AppPropsWithLayout = AppProps & {
	Component: NextPageWithLayout
}

const CHUNK_LOAD_ERROR_KEY = 'chunk-load-error-reload'

const isChunkLoadError = (error: unknown) => {
	if (!error) return false
	if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'ChunkLoadError') {
		return true
	}

	const message = String((error as { message?: string })?.message ?? error)
	return (
		message.includes('ChunkLoadError') || message.includes('Loading chunk') || message.includes('Failed to load chunk')
	)
}

const client = new QueryClient()

function App({ Component, pageProps }: AppPropsWithLayout) {
	const reloadInProgressRef = useRef(false)

	useEffect(() => {
		const reloadOnce = (url?: string) => {
			if (typeof window === 'undefined') return
			if (reloadInProgressRef.current) return

			const targetUrl = url ?? window.location.href
			const lastReloadUrl = sessionStorage.getItem(CHUNK_LOAD_ERROR_KEY)
			if (lastReloadUrl === targetUrl) return

			reloadInProgressRef.current = true
			sessionStorage.setItem(CHUNK_LOAD_ERROR_KEY, targetUrl)
			if (url) {
				window.location.assign(url)
			} else {
				window.location.reload()
			}
		}

		const handleRouteChangeError = (error: unknown, url: string) => {
			if (!isChunkLoadError(error)) return
			reloadOnce(url)
		}

		const handleRouteChangeComplete = () => {
			reloadInProgressRef.current = false
			sessionStorage.removeItem(CHUNK_LOAD_ERROR_KEY)
		}

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			if (!isChunkLoadError(event.reason)) return
			reloadOnce()
		}

		const handleError = (event: ErrorEvent) => {
			if (!isChunkLoadError(event.error ?? event.message)) return
			reloadOnce()
		}

		Router.events.on('routeChangeComplete', handleRouteChangeComplete)
		Router.events.on('routeChangeError', handleRouteChangeError)
		window.addEventListener('unhandledrejection', handleUnhandledRejection)
		window.addEventListener('error', handleError)

		return () => {
			Router.events.off('routeChangeComplete', handleRouteChangeComplete)
			Router.events.off('routeChangeError', handleRouteChangeError)
			window.removeEventListener('unhandledrejection', handleUnhandledRejection)
			window.removeEventListener('error', handleError)
		}
	}, [])

	useAuthBridge()
	useParentAuthTracker()
	useUmamiIdentityTracker()
	useReferrer()
	const getLayout = Component.getLayout ?? ((page: ReactElement) => page)

	return (
		<>
			<Head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
				/>
			</Head>
			<Script
				src="/script2.js"
				strategy="lazyOnload"
				data-website-id="ca346731-f7ec-437f-9727-162f29bb67ae"
				data-host-url="https://tasty.defillama.com"
			/>

			<RouteProgressIndicator />
			{getLayout(<Component {...pageProps} />)}
		</>
	)
}

const AppWrapper = (props: AppPropsWithLayout) => {
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
