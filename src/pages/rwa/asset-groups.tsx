import type { InferGetStaticPropsType } from 'next'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import {
	UNKNOWN_RWA_ASSET_GROUP,
	appendUnknownRwaAssetGroup,
	normalizeRwaAssetGroup
} from '~/containers/RWA/assetGroup'
import { RWAAssetGroups } from '~/containers/RWA/AssetGroups'
import { getRWAAssetGroupsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { RWATabNav } from '~/containers/RWA/TabNav'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/asset-groups`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const { rows: assetGroups, initialChartDataset } = await getRWAAssetGroupsOverview()
	const assetGroupValues = assetGroups.some((row) => row.assetGroup === UNKNOWN_RWA_ASSET_GROUP)
		? appendUnknownRwaAssetGroup(rwaList.assetGroups)
		: rwaList.assetGroups

	const assetGroupLinks = assetGroupValues.map((assetGroup) => {
		const normalizedAssetGroup = normalizeRwaAssetGroup(assetGroup)
		return {
			label: normalizedAssetGroup,
			to: `/rwa/asset-group/${rwaSlug(normalizedAssetGroup)}`
		}
	})

	return {
		props: {
			assetGroups,
			initialChartDataset,
			assetGroupLinks: [{ label: 'All', to: '/rwa/asset-groups' }, ...assetGroupLinks]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA']

export default function RWAAssetGroupsPage({
	assetGroups,
	assetGroupLinks,
	initialChartDataset
}: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="RWA Asset Groups - Real World Asset Analytics - DefiLlama"
			description="Compare RWA asset groups. Track Active Mcap, Onchain Mcap, and DeFi Active TVL across asset groups."
			pageName={pageName}
			canonicalUrl={`/rwa/asset-groups`}
		>
			<RWATabNav active="assetGroups" />
			<RowLinksWithDropdown links={assetGroupLinks} activeLink={'All'} />
			<RWAAssetGroups
				assetGroups={assetGroups}
				initialChartDataset={initialChartDataset}
				page={{ kind: 'assetGroup' }}
			/>
		</Layout>
	)
}
