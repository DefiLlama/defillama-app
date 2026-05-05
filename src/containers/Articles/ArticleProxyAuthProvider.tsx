import type { ReactNode } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import { ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import pb from '~/utils/pocketbase'

export function ArticleProxyAuthProvider({ children }: { children: ReactNode }) {
	const { hasActiveSubscription } = useAuthContext()
	const token = hasActiveSubscription && pb.authStore.isValid ? pb.authStore.token : null
	return <ProxyAuthTokenContext.Provider value={token}>{children}</ProxyAuthTokenContext.Provider>
}
