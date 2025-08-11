import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ProtocolsWithTokens } from '~/containers/ProtocolsWithTokens'
import { getProtocolsTokenPricesByChain } from '~/containers/ProtocolsWithTokens/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`protocols-token-prices/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.chainMetadata[chain]) {
			return { notFound: true }
		}

		const data = await getProtocolsTokenPricesByChain({ chain: metadataCache.chainMetadata[chain].name })

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function ProtocolsTokenPricesByChain(props) {
	return (
		<Layout title="Token Prices - DefiLlama">
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
