import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { ProtocolsWithTokens } from '~/containers/Protocols/ProtocolsWithTokens'
import { getProtocolsTokenPricesByChain } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

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

		const data = await getProtocolsTokenPricesByChain({
			chain: metadataCache.chainMetadata[chain].name,
			protocolMetadata: metadataCache.protocolMetadata
		})

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', 'Token Price']

export default function ProtocolsTokenPricesByChain(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`Token Prices by Protocol on ${props.chain} - DefiLlama`}
			description={`Token Prices by Protocol on ${props.chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`token prices by protocol on ${props.chain}`}
			canonicalUrl={`/token-prices/chain/${props.chain}`}
			pageName={pageName}
		>
			<ProtocolsWithTokens {...props} />
		</Layout>
	)
}
