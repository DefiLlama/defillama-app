import { maxAgeForNext } from '~/api'
import { RWAAssetPage } from '~/containers/RWA/Asset'
import { getRWAAssetData, getRWAAssetsList } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const assets = await getRWAAssetsList()

	return {
		paths: assets.map((asset) => ({ params: { asset: [asset] } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/asset/[...asset]`,
	async ({
		params: {
			asset: [assetSlug]
		}
	}) => {
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
	return (
		<Layout
			title={`${asset.name} - Real World Assets - DefiLlama`}
			description={`${asset.name} RWA details on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${asset.name}, real world assets, defi rwa, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa/asset/${asset.slug}`}
		>
			<RWAAssetPage asset={asset} />
		</Layout>
	)
}
