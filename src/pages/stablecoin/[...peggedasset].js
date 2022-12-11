import * as React from 'react'
import PeggedContainer from '~/containers/PeggedContainer'
import { getPeggedColor } from '~/utils/getColor'
import { addMaxAgeHeaderForNext } from '~/api'
import { getPeggedAssetPageData } from '~/api/categories/stablecoins'

export const getServerSideProps = async ({
	params: {
		peggedasset: [peggedasset]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getPeggedAssetPageData(peggedasset)
	const { chainsUnique, chainCirculatings, peggedAssetData, totalCirculating, unreleased, mcap, bridgeInfo } =
		data.props
	const backgroundColor = await getPeggedColor({
		peggedAsset: peggedAssetData.name
	})
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
		}
	}
}

export default function PeggedAsset(props) {
	return <PeggedContainer {...props} />
}
