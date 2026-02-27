import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { DATByAsset } from '~/containers/DAT/ByAsset'
import { getDATOverviewDataByAsset, getDATAssetPaths } from '~/containers/DAT/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']

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
	if (SKIP_BUILD_STATIC_GENERATION) {
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
	return (
		<Layout
			title={`${props.metadata.name} Treasury Holdings - DefiLlama`}
			description={`Track institutions that own ${props.metadata.name} (${props.metadata.ticker}) as part of their corporate treasury. See total holdings, purchase history and cost basis data in one view.`}
			keywords={`${props.metadata.name} (${props.metadata.ticker}) treasury holdings, ${props.metadata.name} (${props.metadata.ticker}) corporate treasury, ${props.metadata.name} (${props.metadata.ticker}) treasury holdings by institution, ${props.metadata.name} (${props.metadata.ticker}) treasury holdings by company, ${props.metadata.name} (${props.metadata.ticker}) DATs, ${props.metadata.name} (${props.metadata.ticker}) digital asset treasury`}
			canonicalUrl={`/digital-asset-treasuries/${props.asset}`}
			pageName={pageName}
		>
			<DATByAsset {...props} />
		</Layout>
	)
}
