import type { InferGetStaticPropsType } from 'next'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { RWAPerpsAssetGroupsOverview } from '~/containers/RWA/Perps/AssetGroups'
import { getRWAPerpsAssetGroupsOverview } from '~/containers/RWA/Perps/queries'
import { RWAPerpsTabNav } from '~/containers/RWA/Perps/TabNav'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/perps/asset-groups`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { rows: assetGroups, initialChartDataset } = await getRWAPerpsAssetGroupsOverview()

	return {
		props: {
			assetGroups,
			initialChartDataset,
			assetGroupLinks: [
				{ label: 'All', to: '/rwa/perps/asset-groups' },
				...metadataCache.rwaPerpsList.assetGroups.map((assetGroup) => ({
					label: assetGroup,
					to: `/rwa/perps/asset-group/${rwaSlug(assetGroup)}`
				}))
			]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Perps']

export default function RWAPerpsAssetGroupsPage({
	assetGroups,
	initialChartDataset,
	assetGroupLinks
}: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="RWA Perps by Asset Group - DefiLlama"
			description="Compare RWA perpetual asset groups by open interest, 24h volume, and market counts."
			pageName={pageName}
			canonicalUrl="/rwa/perps/asset-groups"
		>
			<RWAPerpsTabNav active="assetGroups" />
			<RowLinksWithDropdown links={assetGroupLinks} activeLink="All" />
			<RWAPerpsAssetGroupsOverview assetGroups={assetGroups} initialChartDataset={initialChartDataset} />
		</Layout>
	)
}
