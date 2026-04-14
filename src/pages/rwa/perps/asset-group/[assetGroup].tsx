import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { DEFAULT_CHART_VIEW } from '~/containers/RWA/Perps/chartState'
import { RWAPerpsDashboard } from '~/containers/RWA/Perps/Dashboard'
import { getRWAPerpsAssetGroupPage } from '~/containers/RWA/Perps/queries'
import { RWAPerpsTabNav } from '~/containers/RWA/Perps/TabNav'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	return {
		paths: metadataCache.rwaPerpsList.assetGroups.slice(0, 10).map((assetGroup) => ({
			params: { assetGroup: rwaSlug(assetGroup) }
		})),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/perps/asset-group/[assetGroup]`,
	async ({ params }: GetStaticPropsContext<{ assetGroup: string }>) => {
		if (!params?.assetGroup) {
			return { notFound: true }
		}

		const data = await getRWAPerpsAssetGroupPage({
			assetGroup: params.assetGroup,
			activeView: DEFAULT_CHART_VIEW
		})

		if (!data) return { notFound: true }

		return {
			props: { data },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA Perps']

export default function RWAPerpsAssetGroupPage({ data }: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${data.assetGroup} RWA Perps Dashboard & Analytics - DefiLlama`}
			description={`Track ${data.assetGroup} RWA perpetual markets. Compare open interest, 24h volume, and venue-level activity.`}
			pageName={pageName}
			canonicalUrl={`/rwa/perps/asset-group/${rwaSlug(data.assetGroup)}`}
		>
			<RWAPerpsTabNav active="assetGroups" />
			<RWAPerpsDashboard mode="assetGroup" data={data} />
		</Layout>
	)
}
