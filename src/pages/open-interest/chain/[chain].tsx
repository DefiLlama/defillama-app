import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import {
	getAdapterByChainPageData,
	getDimensionAdapterOverviewOfAllChains
} from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPEN_INTEREST
const dataType = ADAPTER_DATA_TYPES.OPEN_INTEREST_AT_END
const type = 'Open Interest'

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

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	let chains: Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }> = {}
	try {
		chains = getDimensionAdapterOverviewOfAllChains({
			adapterType,
			dataType,
			chainMetadata: metadataCache.chainMetadata
		})
	} catch {}
	const paths = Object.entries(chains)
		.sort(([, a], [, b]) => (b?.['24h'] ?? 0) - (a?.['24h'] ?? 0))
		.slice(0, 10)
		.map(([chain]) => ({ params: { chain: slug(chain) } }))

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`${type}/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		if (!metadataCache.chainMetadata[chain]?.openInterest) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'open-interest',
			metricName: type
		})

		if (!data) throw new Error('Missing page data')

		const { questions: entityQuestions } = await fetchEntityQuestions(chain, 'chain', {
			subPage: 'open-interest',
			total24h: data.total24h ?? null,
			total7d: data.total7d ?? null,
			change_1d: data.change_1d ?? null,
			change_7dover7d: data.change_7dover7d ?? null,
			change_1m: data.change_1m ?? null,
			openInterest: data.openInterest ?? null,
			topProtocols: data.protocols.slice(0, 15).map((p) => ({
				name: p.name,
				total24h: p.total24h ?? null,
				total7d: p.total7d ?? null,
				openInterest: p.openInterest ?? null,
				chains: p.chains?.slice(0, 3) ?? null
			}))
		})

		return {
			props: { ...data, entityQuestions },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', type]

const OpenInterestOnChain = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`${props.chain} Open Interest - DeFi Derivatives - DefiLlama`}
			description={`Track open interest on ${props.chain} across all derivatives protocols. Compare total open interest and leverage exposure on perp DEXs on ${props.chain}. Real-time ${props.chain} open interest analytics.`}
			canonicalUrl={`/open-interest/chain/${slug(props.chain)}`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default OpenInterestOnChain
