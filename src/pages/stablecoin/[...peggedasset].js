import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getPeggedAssetPageData, getPeggedAssets } from '~/containers/Stablecoins/queries.server'
import PeggedContainer from '~/containers/Stablecoins/StablecoinOverview'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

// todo check name in metadata
export const getStaticProps = withPerformanceLogging(
	'stablecoin/[...peggedasset]',
	async ({
		params: {
			peggedasset: [peggedasset]
		}
	}) => {
		const data = await getPeggedAssetPageData(peggedasset)

		if (!data) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const { chainsUnique, chainCirculatings, peggedAssetData, totalCirculating, unreleased, mcap, bridgeInfo } =
			data.props

		return {
			props: {
				chainsUnique,
				chainCirculatings,
				peggedAssetData,
				totalCirculating,
				unreleased,
				mcap,
				bridgeInfo
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const res = await getPeggedAssets()

	const paths = res.peggedAssets.map(({ name }) => ({
		params: { peggedasset: [slug(name)] }
	}))

	return { paths: paths.slice(0, 1), fallback: 'blocking' }
}

export default function PeggedAsset(props) {
	return <PeggedContainer {...props} />
}
