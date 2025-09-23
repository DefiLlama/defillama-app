import { useRouter } from 'next/router'
import Image from 'next/image'
import { maxAgeForNext } from '~/api'
import lostLlama from '~/assets/404.png'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { LlamaAI } from '~/containers/LlamaAI'
import { useFeatureFlagsContext } from '~/contexts/FeatureFlagsContext'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging('LlamaAiSession', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function SessionPage() {
	const router = useRouter()
	const { sessionId } = router.query
	const { hasFeature, loading, userLoading } = useFeatureFlagsContext()

	if (loading || userLoading) {
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
						<BasicLink href="/protocols" className="text-(--link)">
							DeFi protocols
						</BasicLink>
					</p>
				</div>
			</Layout>
		)
	}

	return <LlamaAI initialSessionId={sessionId as string} />
}