import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAAssetPage } from '~/containers/RWA/Asset'
import { getRWAAssetData } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

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
		paths: rwaList.tickers.slice(0, 10).map((ticker) => ({ params: { asset: rwaSlug(ticker) } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/asset/[asset]`,
	async ({ params }: GetStaticPropsContext<{ asset: string }>) => {
		if (!params?.asset) {
			return { notFound: true }
		}

		const assetSlug = rwaSlug(params.asset)

		let assetId = null
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList

		for (const ticker in rwaList.idMap) {
			if (rwaSlug(ticker) === assetSlug) {
				assetId = rwaList.idMap[ticker]
				break
			}
		}
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
			canonicalUrl={`/rwa/asset/${asset.slug}`}
		>
			<RWAAssetPage asset={asset} />
		</Layout>
	)
}
