import type { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { fetchStablecoinAssetsApi } from '~/containers/Stablecoins/api'
import { getStablecoinAssetPageData } from '~/containers/Stablecoins/queries.server'
import StablecoinAssetOverview from '~/containers/Stablecoins/StablecoinOverview'
import type { PeggedAssetPageProps } from '~/containers/Stablecoins/types'
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
	const res = await fetchStablecoinAssetsApi()

	const paths = res.peggedAssets.map(({ name }) => ({
		params: { peggedasset: slug(name) }
	}))

	return { paths: paths.slice(0, 1), fallback: 'blocking' }
}

export default function StablecoinAssetPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <StablecoinAssetOverview {...props} />
}
