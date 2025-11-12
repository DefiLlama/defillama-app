import { useEffect, useLayoutEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ensurePersistedQueriesHydrated, subscribeToQueryPersistence } from '~/utils/queryCachePersistence'

export function QueryCachePersistence() {
	const queryClient = useQueryClient()

	const hydratedRef = useRef(false)

	useLayoutEffect(() => {
		if (!hydratedRef.current) {
			ensurePersistedQueriesHydrated(queryClient)
			hydratedRef.current = true
		}
	}, [queryClient])

	useEffect(() => {
		const unsubscribe = subscribeToQueryPersistence(queryClient)
		return () => {
			unsubscribe?.()
		}
	}, [queryClient])

	return null
}
