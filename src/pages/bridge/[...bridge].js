import * as React from 'react'
import BridgeContainer from '~/containers/BridgeContainer'
import { standardizeProtocolName } from '~/utils'
import { revalidate } from '~/api'
import { getBridgePageData, getBridges } from '~/api/categories/bridges'

export async function getStaticProps({
	params: {
		bridge: [bridge]
	}
}) {
	const data = await getBridgePageData(bridge)
	const {
		displayName,
		chains,
		defaultChain,
		chainToChartDataIndex,
		bridgeChartDataByChain,
		prevDayDataByChain
	} = data
	/*
	const backgroundColor = await getPeggedColor({
		peggedAsset: peggedAssetData.name
	})
	*/
	return {
		props: {
			displayName,
			chains,
			defaultChain,
			chainToChartDataIndex,
			bridgeChartDataByChain,
			prevDayDataByChain
			// backgroundColor
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const res = await getBridges()

	const paths = res.bridges.map(({ displayName }) => ({
		params: { bridge: [standardizeProtocolName(displayName)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Bridge(props) {
	return <BridgeContainer {...props} />
}
