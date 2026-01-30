import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWAAssetPage } from '~/containers/RWA/Asset'
import { getRWAAssetData } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	return {
		paths: metadataCache.rwaList.tickers.slice(0, 10).map((ticker) => ({ params: { asset: rwaSlug(ticker) } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/asset/[asset]`,
	async ({ params }: GetStaticPropsContext<{ asset: string }>) => {
		if (!params?.asset) {
			return { notFound: true, props: null }
		}

		const assetSlug = rwaSlug(params.asset)

		let assetExists = false
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList

		for (const ticker of rwaList.tickers) {
			if (rwaSlug(ticker) === assetSlug) {
				assetExists = true
				break
			}
		}
		if (!assetExists) {
			return { notFound: true, props: null }
		}

		const asset = await getRWAAssetData(assetSlug)

		return {
			props: { asset },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAAssetDetailPage({ asset }) {
	const displayName = asset?.name ?? asset?.ticker ?? asset?.slug ?? 'RWA Asset'
	return (
		<Layout
			title={`${displayName} - Real World Assets - DefiLlama`}
			description={`${displayName} RWA details on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${displayName}, real world assets, defi rwa, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa/asset/${asset.slug}`}
		>
			<RWAAssetPage asset={asset} />
		</Layout>
	)
}
