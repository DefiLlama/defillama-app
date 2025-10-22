import Image from 'next/image'
import { maxAgeForNext } from '~/api'
import lostLlama from '~/assets/404.png'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage() {
	const { hasFeature, isSubscriptionLoading } = useSubscribe()
	const { loaders: { userLoading } } = useAuthContext()

	if (isSubscriptionLoading || userLoading) {
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

	// Show 404 page if llamaai feature flag is disabled
	if (!hasFeature('llamaai')) {
		return (
			<Layout
				title="Page not found - DefiLlama"
				description={`DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
				keywords=""
				canonicalUrl={`/404`}
			>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<Image src={lostLlama} width={350} height={350} alt="Want a ride?" />
					<p className="text-center text-base text-(--text-label)">
						This page doesn&apos;t exist. Check out{' '}
						<BasicLink href="/metrics" className="underline">
							other dashboards
						</BasicLink>
						.
					</p>
				</div>
			</Layout>
		)
	}

	// Show LlamaAI if feature flag is enabled
	return <LlamaAI showDebug={hasFeature('llama-ai-debug')} />
}
