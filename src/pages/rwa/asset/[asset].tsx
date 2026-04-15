import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAAssetPage } from '~/containers/RWA/Asset'
import { getRWAAssetData } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

function safeDecodeAssetParam(value: string): string {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	return {
		paths: rwaList.canonicalMarketIds.slice(0, 10).map((canonicalMarketId) => ({ params: { asset: canonicalMarketId } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/asset/[asset]`,
	async ({ params }: GetStaticPropsContext<{ asset: string }>) => {
		if (!params?.asset) {
			return { notFound: true }
		}

		const canonicalMarketId = safeDecodeAssetParam(params.asset)

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList
		const assetId = rwaList.idMap[canonicalMarketId] ?? null
		if (!assetId) {
			return { notFound: true }
		}

		const asset = await getRWAAssetData({ assetId })

		if (!asset) {
			return { notFound: true }
		}

		return {
			props: { asset },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAAssetDetailPage({ asset }) {
	const displayName =
		asset.assetName && asset.ticker
			? `${asset.assetName} (${asset.ticker})`
			: (asset.ticker ?? asset.slug ?? 'RWA Asset')

	return (
		<Layout
			title={`${displayName} - RWA Dashboard & Analytics - DefiLlama`}
			description={`Overview of the tokenized real-world asset ${displayName}, including supply, blockchain distribution, and platform data. DefiLlama provides transparent, ad-free RWA analytics.`}
			pageName={pageName}
			canonicalUrl={`/rwa/asset/${encodeURIComponent(asset.slug)}`}
		>
			<RWAAssetPage asset={asset} />
		</Layout>
	)
}
