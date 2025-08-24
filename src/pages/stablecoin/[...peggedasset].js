import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getPeggedAssetPageData, getPeggedAssets } from '~/containers/Stablecoins/queries.server'
import PeggedContainer from '~/containers/Stablecoins/StablecoinOverview'
import { slug } from '~/utils'
import { withErrorLogging } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'stablecoin/[...peggedasset]',
	async ({
		params: {
			peggedasset: [peggedasset]
		}
	}) => {
		const data = await withErrorLogging(getPeggedAssetPageData)(peggedasset)
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
