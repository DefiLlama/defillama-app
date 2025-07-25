import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { McapsByChain } from '~/containers/ProtocolMcaps/McapsByChain'
import { getProtocolsMarketCapsByChain } from '~/containers/ProtocolMcaps/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`protocols-market-caps/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.chainMetadata[chain]) {
			return { notFound: true }
		}

		const data = await getProtocolsMarketCapsByChain({ chain: metadataCache.chainMetadata[chain].name })

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function ProtocolsMarketCapsByChain(props) {
	return (
		<Layout title="Protocols Market Caps - DefiLlama">
			<McapsByChain {...props} />
		</Layout>
	)
}
