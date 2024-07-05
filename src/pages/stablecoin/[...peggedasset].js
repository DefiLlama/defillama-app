import * as React from 'react'
import PeggedContainer from '~/containers/PeggedContainer'
import { peggedAssetIconPalleteUrl, standardizeProtocolName } from '~/utils'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getPeggedAssetPageData, getPeggedAssets } from '~/api/categories/stablecoins'
import { primaryColor } from '~/constants/colors'
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

		const name = peggedAssetData.name

		const backgroundColor = name ? await getColor(peggedAssetIconPalleteUrl(name)) : primaryColor

		return {
			props: {
				chainsUnique,
				chainCirculatings,
				peggedAssetData,
				totalCirculating,
				unreleased,
				mcap,
				bridgeInfo,
				backgroundColor
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const res = await getPeggedAssets()

	const paths = res.peggedAssets.map(({ name }) => ({
		params: { peggedasset: [standardizeProtocolName(name)] }
	}))

	return { paths: paths.slice(0, 1), fallback: 'blocking' }
}

export default function PeggedAsset(props) {
	return <PeggedContainer {...props} />
}
