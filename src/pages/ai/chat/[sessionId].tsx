import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import { useSubscribe } from '~/hooks/useSubscribe'
import Layout from '~/layout'

export default function SessionPage() {
	const router = useRouter()
	const { sessionId } = router.query
	const { hasFeature } = useFeatureFlagsContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders } = useAuthContext()

	const isLoading = isSubscriptionLoading || loaders.userLoading

	useEffect(() => {
		if (isLoading) return
		if (subscription?.status !== 'active') {
			router.push('/ai')
		}
	}, [subscription, isLoading, router])

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

	if (subscription?.status !== 'active') {
		return null
	}

	return (
		<LlamaAI
			initialSessionId={sessionId as string}
			showDebug={hasFeature('llama-ai-debug')}
			key={`llamai-session-page-${sessionId}`}
		/>
	)
}
