import type { InferGetStaticPropsType } from 'next'
import { ExtraTvlByChain } from '~/containers/Protocols/ExtraTvlByChain'
import { getExtraTvlByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`total-borrowed/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getExtraTvlByChain({
		chain: 'All',
		metric: 'borrowed',
		protocolMetadata: metadataCache.protocolMetadata
	})

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Total Value Borrowed']

export default function TotalBorrowed(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Total Value Borrowed Rankings - DeFi Lending TVL - DefiLlama"
			description="Track total value borrowed across DeFi lending protocols. Compare borrowed TVL in Aave, Compound, MakerDAO, and 100+ lending protocols on Ethereum, Solana, Base, and all major chains. Real-time DeFi borrowing analytics."
			canonicalUrl={`/total-borrowed`}
			pageName={pageName}
		>
			<ExtraTvlByChain {...props} />
		</Layout>
	)
}
