import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWA_ID_MAP_API } from '~/constants'
import { RWAAssetPage } from '~/containers/RWA/Asset'
import { getRWAAssetData, getRWAAssetsList } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const assets = await getRWAAssetsList()

	return {
		paths: assets.slice(0, 10).map((asset) => ({ params: { asset } })),
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

		// const idMap = await fetchJson<Record<string, string>>(RWA_ID_MAP_API)
		// if (!idMap) {
		// 	throw new Error('Failed to get RWA ID map')
		// }
		// let assetId = null
		// for (const assetName in idMap) {
		// 	if (rwaSlug(assetName) === assetSlug) {
		// 		assetId = idMap[assetName]
		// 		break
		// 	}
		// }
		// if (!assetId) {
		// 	return { notFound: true, props: null }
		// }

		const asset = await getRWAAssetData(assetSlug)

		if (!asset) return { notFound: true }

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
