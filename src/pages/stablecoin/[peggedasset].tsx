import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getStablecoinAssetPageData } from '~/containers/Stablecoins/queries.server'
import StablecoinAssetOverview from '~/containers/Stablecoins/StablecoinOverview'
import type { PeggedAssetPageProps } from '~/containers/Stablecoins/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

type StablecoinAssetRouteParams = {
	peggedasset: string
}

export const getStaticProps = withPerformanceLogging<PeggedAssetPageProps>(
	'stablecoin/[peggedasset]',
	async ({ params }: GetStaticPropsContext<StablecoinAssetRouteParams>) => {
		const peggedasset = params?.peggedasset
		if (typeof peggedasset !== 'string') {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
		}

		const peggedAssetSlug = slug(peggedasset)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.stablecoinPeggedAssetSlugsSet.has(peggedAssetSlug)) {
			return { notFound: true, revalidate: maxAgeForNext([22]) }
		}

		const data = await getStablecoinAssetPageData(peggedAssetSlug)
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
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { getStablecoinAssetStaticPaths } = await import('~/server/routeCache/assets')
	const paths = await getStablecoinAssetStaticPaths()

	return { paths, fallback: 'blocking' }
}

export default function StablecoinAssetPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const { name, symbol } = props.peggedAssetData
	const nameWithSymbol = name + (symbol && symbol !== '-' ? ` (${symbol})` : '')
	return (
		<Layout
			title={`${nameWithSymbol} Market Cap, Supply & Peg Chart - DefiLlama`}
			description={`Track ${nameWithSymbol} market cap, circulating supply, price, inflows, and percent off peg. View ${nameWithSymbol} stablecoin charts and historical analytics across blockchains on DefiLlama.`}
			canonicalUrl={`/stablecoin/${slug(name)}`}
		>
			<StablecoinAssetOverview {...props} />
		</Layout>
	)
}
