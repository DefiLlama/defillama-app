import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import {
	getAdapterByChainPageData,
	getDimensionAdapterOverviewOfAllChains
} from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.NORMALIZED_VOLUME
const dataType = ADAPTER_DATA_TYPES.DAILY_NORMALIZED_VOLUME
const type = 'Normalized Volume'

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

		if (!metadataCache.chainMetadata[chain]?.normalizedVolume) {
			return { notFound: true }
		}

		const data = await getAdapterByChainPageData({
			adapterType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'normalized-volume',
			metricName: type
		})

		if (!data) throw new Error(`Missing page data for route=/normalized-volume/chain/[chain] chain=${chain}`)

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', type]

const NormalizedVolumeOnChain = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`${props.chain} Normalized DEX Volume - DefiLlama`}
			description={`Track normalized perp volume on ${props.chain} with suspected wash trading filtered out. Compare genuine activity after liquidity filtering.`}
			canonicalUrl={`/normalized-volume/chain/${slug(props.chain)}`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default NormalizedVolumeOnChain
