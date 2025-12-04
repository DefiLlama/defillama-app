import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { maxAgeForNext } from '~/api'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage() {
	const { user, loaders } = useAuthContext()
	const { hasActiveSubscription, isSubscriptionLoading } = useSubscribe()
	const router = useRouter()

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

	return <LlamaAI showDebug={user?.flags?.['is_llama'] ?? false} />
}
