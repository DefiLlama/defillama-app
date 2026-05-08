import type { ReactNode } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'

export function useHasArticlesAccess() {
	const { user, isAuthenticated, loaders } = useAuthContext()
	return {
		isLoading: loaders.userLoading,
		isAuthenticated,
		hasAccess: isAuthenticated && Boolean(user?.flags?.is_llama)
	}
}

export function ArticlesAccessGate({
	children,
	loadingFallback = null
}: {
	children: ReactNode
	loadingFallback?: ReactNode
}) {
	const { isLoading, hasAccess } = useHasArticlesAccess()
	if (isLoading) return <>{loadingFallback}</>
	if (!hasAccess) return null
	return <>{children}</>
}
