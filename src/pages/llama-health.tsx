import { LlamaHealth } from '~/containers/LlamaHealth'
import { getLlamaHealthData } from '~/containers/LlamaHealth/queries'
import type { LlamaHealthProps } from '~/containers/LlamaHealth/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('llama-health', async () => {
	const data = await getLlamaHealthData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Llama Health']

export default function LlamaHealthPage(props: LlamaHealthProps) {
	return (
		<Layout
			title="Llama Health - Protocol Sustainability Scores - DefiLlama"
			description="Protocol health scores based on fee generation, TVL stability, chain diversification, and audit status. Category-relative scoring across 1000+ DeFi protocols on DefiLlama."
			canonicalUrl="/llama-health"
			pageName={pageName}
		>
			<LlamaHealth {...props} />
		</Layout>
	)
}
