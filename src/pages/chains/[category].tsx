import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'chains/[category]',
	async ({ params }: GetStaticPropsContext<{ category: string }>) => {
		if (!params?.category) {
			return { notFound: true, props: null }
		}

		const { category } = params
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const data = await getChainsByCategory({ chainMetadata: metadataCache.chainMetadata, category })
		const { questions: entityQuestions } = await fetchEntityQuestions('chains', 'page', { category })
		return {
			props: { ...data, entityQuestions },
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Chains(props) {
	return <ChainsByCategory {...props} />
}
