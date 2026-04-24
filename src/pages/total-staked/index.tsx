import type { InferGetStaticPropsType } from 'next'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`total-staked/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getExtraTvlByChain({
		chain: 'All',
		metric: 'staking',
		protocolMetadata: metadataCache.protocolMetadata
	})

	if (!data) throw new Error('Missing page data')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Total Value Staked']

export default function TotalStaked(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Total Staked Rankings - Staking Value - DefiLlama"
			description={`Track total staked value rankings across DeFi protocols. Compare staking TVL and value locked in staking contracts across 7000+ protocols on 500+ chains.`}
			canonicalUrl={`/total-staked`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
