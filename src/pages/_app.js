import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import NProgress from 'nprogress'
import { AppContext } from '~/contexts'
import { useAnalytics } from '~/hooks/useAnalytics'
import '../tailwind.css'
import '../nprogress.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { AuthProvider } from '~/containers/Subscribtion/auth'

NProgress.configure({ showSpinner: false })

const client = new QueryClient()

function App({ Component, pageProps }) {
	useAnalytics()

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

	return (
		<QueryClientProvider client={client}>
			<AuthProvider>
				<AppContext noContext={pageProps.noContext ?? false}>
					<Component {...pageProps} />
				</AppContext>
			</AuthProvider>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}

export default App
