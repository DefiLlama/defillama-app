import type { InferGetStaticPropsType } from 'next'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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
			title="Pool2 TVL Rankings - Value Locked - DefiLlama"
			description={`Track Pool2 TVL rankings across DeFi protocols. Compare pool2 value locked in liquidity pools and staking contracts across 7000+ protocols on 500+ chains.`}
			canonicalUrl={`/pool2`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
