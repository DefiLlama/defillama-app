import { useRouter } from 'next/router'
import { maxAgeForNext } from '~/api'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage() {
	const router = useRouter()
	const isClient = useIsClient()
	const { user, loaders, hasActiveSubscription } = useAuthContext()

	if (!isClient || loaders.userLoading) {
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
		return (
			<Layout
				title="LlamaAI - DefiLlama"
				description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Please{' '}
						<BasicLink href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`} className="underline">
							subscribe
						</BasicLink>{' '}
						to access this page.
					</p>
				</div>
			</Layout>
		)
	}

	return <LlamaAI showDebug={user?.flags?.['is_llama'] ?? false} />
}
