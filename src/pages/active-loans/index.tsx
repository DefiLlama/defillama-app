import type { InferGetStaticPropsType } from 'next'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`active-loans/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getExtraTvlByChain({
		chain: 'All',
		metric: 'borrowed',
		protocolMetadata: metadataCache.protocolMetadata
	})

	if (!data) throw new Error('Missing page data')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Active Loans']

export default function ActiveLoans(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Active Loans Rankings - DeFi Lending Analytics - DefiLlama"
			description="Track active loans across DeFi lending protocols. Compare active loan value in Aave, Compound, MakerDAO, and 100+ lending protocols on Ethereum, Solana, Base, and all major chains."
			canonicalUrl={`/active-loans`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
