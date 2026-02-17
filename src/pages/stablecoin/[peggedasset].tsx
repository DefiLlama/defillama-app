import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { getStablecoinAssetPageData } from '~/containers/Stablecoins/queries.server'
import StablecoinAssetOverview from '~/containers/Stablecoins/StablecoinOverview'
import type { PeggedAssetPageProps } from '~/containers/Stablecoins/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinAssetRouteParams = {
	peggedasset: string
}

export const getStaticProps = withPerformanceLogging<PeggedAssetPageProps>(
	'stablecoin/[peggedasset]',
	async ({ params }: GetStaticPropsContext<StablecoinAssetRouteParams>) => {
		const peggedasset = params?.peggedasset
		if (typeof peggedasset !== 'string') {
			return { notFound: true }
		}

		const data = await getStablecoinAssetPageData(peggedasset)
		if (!data) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		return {
			props: data.props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths: GetStaticPaths<StablecoinAssetRouteParams> = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const res = await fetchStablecoinAssetsApi()

	const paths = res.peggedAssets.map(({ name }) => ({
		params: { peggedasset: slug(name) }
	}))

	return { paths: paths.slice(0, 1), fallback: 'blocking' }
}

export default function StablecoinAssetPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const { name, symbol } = props.peggedAssetData
	const nameWithSymbol = name + (symbol && symbol !== '-' ? ` (${symbol})` : '')
	return (
		<Layout
			title={`${nameWithSymbol} - DefiLlama`}
			description={`Track ${nameWithSymbol} supply, market cap, price, and inflows on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${nameWithSymbol.toLowerCase()} total supply, ${nameWithSymbol.toLowerCase()} market cap, ${nameWithSymbol.toLowerCase()} price, ${nameWithSymbol.toLowerCase()} circulating, ${nameWithSymbol.toLowerCase()} stats`}
			canonicalUrl={`/stablecoin/${slug(name)}`}
		>
			<StablecoinAssetOverview {...props} />
		</Layout>
	)
}
