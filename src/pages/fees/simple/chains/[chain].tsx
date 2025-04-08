import { maxAgeForNext } from '~/api'
import { ADAPTOR_TYPES, getDimensionAdapterChainPageData } from '~/api/categories/adaptors'
import { SEO } from '~/components/SEO'
import OverviewContainer, { IOverviewContainerProps } from '~/containers/DexsAndFees'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { GetStaticPropsContext } from 'next'
import metadataCache from '~/utils/metadata'
const chainMetadata = metadataCache.chainMetadata

const ADAPTOR_TYPE = ADAPTOR_TYPES.FEES

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

	const paths = []
	for (const chainId in chainMetadata) {
		if (chainMetadata[chainId][ADAPTOR_TYPE]) {
			paths.push({ params: { chain: chainId } })
		}
	}

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`${ADAPTOR_TYPE}/simple/chains/[chain]`,
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
				isSimpleFees: true,
				title: `${chainMetadata[chain].name} Fees - DefiLlama`
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

interface IPageProps extends IOverviewContainerProps {
	isSimpleFees: boolean
	title: string
}

const SimpleFeesByChain = ({ title, ...props }: IPageProps) => {
	return (
		<Layout title={title}>
			<SEO pageType={props.type} />
			<OverviewContainer {...props} />
		</Layout>
	)
}

export default SimpleFeesByChain
