import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { DATByAsset } from '~/containers/DAT/ByAsset'
import { getDATOverviewDataByAsset, getDATAssetPaths } from '~/containers/DAT/queries'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasuries/[asset]',
	async ({ params }: GetStaticPropsContext<{ asset: string }>) => {
		if (!params?.asset) {
			return { notFound: true, props: null }
		}

		const asset = slug(params.asset)

		const props = await getDATOverviewDataByAsset(asset)

		if (!props) {
			return { notFound: true, props: null }
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const slugs = await getDATAssetPaths()
	const paths = slugs.map((asset) => ({ params: { asset } }))

	return { paths, fallback: false }
}

export default function TreasuriesByAssetPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <DATByAsset {...props} />
}
