import type { GetStaticPropsContext } from 'next'
import { feesOptions } from '~/components/Filters/options'
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

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_EARNINGS
const type = 'Earnings'

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
	const chains = await getDimensionAdapterOverviewOfAllChains({
		adapterType,
		dataType,
		chainMetadata: metadataCache.chainMetadata
	}).catch(() => ({}))
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

		if (!metadataCache.chainMetadata[chain]?.fees) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			dataType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'earnings',
			metricName: type
		}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : chain:${chain}`, e))

		if (!data) return { notFound: true }

		const { questions: entityQuestions } = await fetchEntityQuestions(chain, 'chain', {
			subPage: 'earnings',
			total24h: data.total24h ?? null,
			total7d: data.total7d ?? null,
			change_1d: data.change_1d ?? null,
			change_7dover7d: data.change_7dover7d ?? null,
			change_1m: data.change_1m ?? null,
			topProtocols: data.protocols.slice(0, 15).map((p) => ({
				name: p.name,
				earnings24h: p.total24h ?? null,
				earnings7d: p.total7d ?? null,
				mcap: p.mcap ?? null,
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

const EarningsOnChain = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`${type} by Protocol on ${props.chain} - DefiLlama`}
			description={`Real-time DeFi ${type} analytics by protocol for ${props.chain}. Track net earnings rankings showing revenue minus incentives for every protocol across the ecosystem.`}
			keywords={`${type} by protocol on ${props.chain}`.toLowerCase()}
			canonicalUrl={`/earnings/chain/${props.chain}`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Earnings"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default EarningsOnChain
