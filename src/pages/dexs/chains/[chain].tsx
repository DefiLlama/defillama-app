import { maxAgeForNext } from '~/api'
import { ADAPTOR_TYPES, getDimensionAdapterChainPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import OverviewContainer, { IOverviewContainerProps } from '~/containers/DimensionAdapters'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { GetStaticPropsContext } from 'next'
import metadataCache from '~/utils/metadata'
import { fetchWithErrorLogging } from '~/utils/async'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
const chainMetadata = metadataCache.chainMetadata

const ADAPTOR_TYPE = ADAPTOR_TYPES.DEXS

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
		`${DIMENISIONS_OVERVIEW_API}/${ADAPTOR_TYPE}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
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
	`${ADAPTOR_TYPE}/chains/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		if (!chainMetadata[chain][ADAPTOR_TYPE]) {
			return { notFound: true }
		}
		const data = await getDimensionAdapterChainPageData(ADAPTOR_TYPE, chain).catch((e) =>
			console.info(`Chain page data not found ${ADAPTOR_TYPE} : ${chain}`, e)
		)

		if (!data || !data.protocols || data.protocols.length <= 0) return { notFound: true }

		const categories = new Set<string>()

		data.protocols.forEach((p) => {
			if (p.category) {
				categories.add(p.category)
			}
		})

		return {
			props: {
				...data,
				type: ADAPTOR_TYPE,
				categories: Array.from(categories),
				title: `${chainMetadata[chain].name} DEXs Volume - DefiLlama`
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

interface IPageProps extends IOverviewContainerProps {
	title: string
}

const VolumeByChain = ({ title, ...props }: IPageProps) => {
	return (
		<Layout title={title}>
			<SEO pageType={props.type} />
			<OverviewContainer {...props} />
		</Layout>
	)
}

export default VolumeByChain
