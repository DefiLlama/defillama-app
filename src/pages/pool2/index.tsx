import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`pool2/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getExtraTvlByChain({
		chain: 'All',
		metric: 'pool2',
		protocolMetadata: metadataCache.protocolMetadata
	})

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Pool2 TVL']

export default function Pool2TVL(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Pool2 TVL - DefiLlama"
			description={`Pool2 TVL by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`pool2 tvl by protocol`}
			canonicalUrl={`/pool2`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
