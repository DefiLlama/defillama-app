import Script from 'next/script'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import NProgress from 'nprogress'
import '~/tailwind.css'
import '~/nprogress.css'
import { useEffect, useState } from 'react'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { LlamaAIWelcomeModal } from '~/components/Modal/LlamaAIWelcomeModal'
import { UserSettingsSync } from '~/components/UserSettingsSync'
import { AUTH_SERVER } from '~/constants'
import { AuthProvider, useAuthContext } from '~/containers/Subscribtion/auth'
import { FeatureFlagsProvider, useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import { useLlamaAIWelcome } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'

NProgress.configure({ showSpinner: false })

const client = new QueryClient()

function LlamaAIWelcomeWrapper() {
	const [shown, setShown] = useLlamaAIWelcome()
	const isClient = useIsClient()
	const { hasFeature, loading } = useFeatureFlagsContext()
	const { subscription } = useSubscribe()
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)

	useEffect(() => {
		if (shown) return
		if (!subscription || subscription.status !== 'active') return

		const pathname = router.pathname
		if (pathname.startsWith('/ai') || pathname.startsWith('/subscription')) return

		if (isClient && !loading && hasFeature('llamaai')) {
			setShowModal(true)
		}
	}, [shown, isClient, loading, hasFeature, subscription, router.pathname])

	const handleClose = () => {
		setShowModal(false)
		setShown()
	}

	if (shown) return null

	return <LlamaAIWelcomeModal isOpen={showModal} onClose={handleClose} />
}

function App({ Component, pageProps }: AppProps) {
	const router = useRouter()

	const { user } = useAuthContext()

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

	const { authorizedFetch } = useAuthContext()
	const { data: userHash } = useQuery({
		queryKey: ['user-hash-front', user?.id],
		queryFn: () =>
			authorizedFetch(`${AUTH_SERVER}/user/front-hash`)
				.then((res) => {
					if (!res.ok) {
						throw new Error('Failed to fetch user hash')
					}
					return res.json()
				})
				.then((data) => data.userHash)
				.catch((err) => {
					console.log('Error fetching user hash:', err)
					return null
				}),
		enabled: !!user?.id,
		staleTime: 1000 * 60 * 60 * 24,
		refetchOnWindowFocus: false,
		retry: 3
	})

	return (
		<>
			{userHash ? (
				<Script
					src="/front-chat.js"
					strategy="afterInteractive"
					onLoad={() => {
						if (typeof window !== 'undefined' && (window as any).FrontChat) {
							;(window as any).FrontChat('init', {
								chatId: '623911979437ffab2baa1ecd42c9e27f',
								useDefaultLauncher: true,
								email: user.email,
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
					<FeatureFlagsProvider>
						<App {...props} />
						<LlamaAIWelcomeWrapper />
					</FeatureFlagsProvider>
				</AuthProvider>
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		</>
	)
}

export default AppWrapper
