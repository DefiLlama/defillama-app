import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { ChainByAdapter2 } from '~/containers/DimensionAdapters/ChainByAdapter2'
import { ADAPTOR_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import metadataCache from '~/utils/metadata'
import { fetchWithErrorLogging } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'

const ADAPTOR_TYPE = ADAPTOR_TYPES.OPTIONS
const dataType = 'dailyPremiumVolume'
const type = 'Options Premium Volume'

export const getStaticPaths = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const chains = await fetchWithErrorLogging(
		`${DIMENISIONS_OVERVIEW_API}/${ADAPTOR_TYPE}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=${dataType}`
	)
		.then((res) => res.json())
		.then((res) => (res.allChains ?? []).slice(0, 10))
		.catch(() => [])

	const paths = []
	for (const chain of chains) {
		paths.push({ params: { chain: slug(chain) } })
	}

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`${slug(type)}/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		if (!metadataCache.chainMetadata[chain].options) {
			return { notFound: true }
		}

		const data = await getAdapterChainPageData({
			adaptorType: ADAPTOR_TYPE,
			dataType,
			chain: metadataCache.chainMetadata[chain].name,
			route: 'options/premium-volume'
		}).catch((e) => console.info(`Chain page data not found ${ADAPTOR_TYPE}:${dataType} : chain:${chain}`, e))

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const PremiumVolumeOnChain = (props) => {
	return (
		<Layout title={`${props.chain} ${type} - DefiLlama`} defaultSEO>
			<ChainByAdapter2 {...props} type={type} />
		</Layout>
	)
}

export default PremiumVolumeOnChain
