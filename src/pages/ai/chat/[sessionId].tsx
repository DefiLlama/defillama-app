import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import Layout from '~/layout'

export default function SessionPage() {
	const router = useRouter()
	const { sessionId } = router.query
	const { user, loaders } = useAuthContext()
	const { hasActiveSubscription, isSubscriptionLoading } = useSubscribe()

	const isLoading = loaders.userLoading || isSubscriptionLoading

	useEffect(() => {
		if (isLoading) return
		if (!hasActiveSubscription) {
			const timeout = setTimeout(() => {
				router.push('/ai')
			}, 1500)
			return () => clearTimeout(timeout)
		}
	}, [isLoading, hasActiveSubscription, router])

	if (isLoading) {
		return (
			<Layout
				title="LlamaAI - DefiLlama"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Loading
						<LoadingDots />
					</p>
				</div>
			</Layout>
		)
	}

	if (!hasActiveSubscription) {
		return null
	}

	return (
		<LlamaAI
			initialSessionId={sessionId as string}
			showDebug={user?.flags?.['is_llama'] ?? false}
			key={`llamai-session-page-${sessionId}`}
		/>
	)
}
