import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { maxAgeForNext } from '~/api'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import { useSubscribe } from '~/hooks/useSubscribe'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage() {
	const { hasFeature } = useFeatureFlagsContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const router = useRouter()

	useEffect(() => {
		if (isSubscriptionLoading) return
		if (subscription?.status !== 'active') {
			router.push('/ai')
		}
	}, [subscription, isSubscriptionLoading, router])

	if (isSubscriptionLoading) {
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

	return <LlamaAI showDebug={hasFeature('llama-ai-debug')} />
}
