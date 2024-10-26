import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export function useNFTApp() {
	const router = useRouter()
	return router.pathname.startsWith('/nfts')
}

export function useYieldApp() {
	const router = useRouter()
	return router.pathname.startsWith('/yields')
}

export function usePeggedApp() {
	const router = useRouter()
	return router.pathname.startsWith('/stablecoin') || router.pathname.startsWith('/stablecoins')
}

export function useDexsApp() {
	const router = useRouter()
	return router.pathname.startsWith('/dex')
}

export function useFeesApp() {
	const router = useRouter()
	return router.pathname.startsWith('/fees')
}

export function usePeggedChainOverview() {
	const router = useRouter()
	return router.pathname.startsWith('/stablecoins/chains')
}

export const useScrollToTop = () => {
	useEffect(() => {
		if (window) {
			window.scrollTo({
				behavior: 'smooth',
				top: 0
			})
		}
	}, [])
}

export const useIsClient = () => {
	const [isClient, setIsClient] = useState(false)

	const windowType = typeof window

	useEffect(() => {
		if (windowType !== 'undefined') {
			setIsClient(true)
		}
	}, [windowType])

	return isClient
}
