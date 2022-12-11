import * as React from 'react'
import BridgeContainer from '~/containers/BridgeContainer'
import { addMaxAgeHeaderForNext } from '~/api'
import { getBridgePageData } from '~/api/categories/bridges'

export const getServerSideProps = async ({
	params: {
		bridge: [bridge]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getBridgePageData(bridge)
	const { displayName, logo, chains, defaultChain, chainToChartDataIndex, bridgeChartDataByChain, prevDayDataByChain } =
		data
	/*
	const backgroundColor = await getPeggedColor({
		peggedAsset: peggedAssetData.name
	})
	*/
	return {
		props: {
			displayName,
			logo,
			chains,
			defaultChain,
			chainToChartDataIndex,
			bridgeChartDataByChain,
			prevDayDataByChain
			// backgroundColor
		}
	}
}

export default function Bridge(props) {
	return <BridgeContainer {...props} />
}
