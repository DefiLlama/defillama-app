import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAOverview } from '~/containers/RWA'
import { appendUnknownRwaAssetGroup, normalizeRwaAssetGroup } from '~/containers/RWA/assetGroup'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { RWATabNav } from '~/containers/RWA/TabNav'
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
	const rwaList = metadataCache.rwaList
	return {
		paths: appendUnknownRwaAssetGroup(rwaList.assetGroups)
			.slice(0, 10)
			.map((assetGroup) => ({ params: { assetGroup: rwaSlug(normalizeRwaAssetGroup(assetGroup)) } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/asset-group/[assetGroup]`,
	async ({ params }: GetStaticPropsContext<{ assetGroup: string }>) => {
		if (!params?.assetGroup) {
			return { notFound: true }
		}

		const assetGroupSlug = rwaSlug(params.assetGroup)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList

		let assetGroupName = null
		for (const assetGroup of appendUnknownRwaAssetGroup(rwaList.assetGroups)) {
			const normalizedAssetGroup = normalizeRwaAssetGroup(assetGroup)
			if (rwaSlug(normalizedAssetGroup) === assetGroupSlug) {
				assetGroupName = normalizedAssetGroup
				break
			}
		}

		if (!assetGroupName) {
			return { notFound: true }
		}

		const props = await getRWAAssetsOverview({ assetGroup: assetGroupSlug, rwaList })
		if (!props || props.assets.length === 0) {
			return { notFound: true }
		}

		return {
			props: { ...props, assetGroupName },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAAssetGroupPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.assetGroupName} RWA Dashboard & Analytics - DefiLlama`}
			description={`Track ${props.assetGroupName} RWA assets onchain. Compare Active Mcap, Onchain Mcap, DeFi Active TVL, and utilization.`}
			pageName={pageName}
			canonicalUrl={`/rwa/asset-group/${props.assetGroupSlug}`}
		>
			<RWATabNav active="assetGroups" />
			<RWAOverview {...props} />
		</Layout>
	)
}
