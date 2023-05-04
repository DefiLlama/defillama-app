import * as React from 'react'
import BridgeContainer from '~/containers/BridgeContainer'
import { standardizeProtocolName } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getBridgePageData, getBridges } from '~/api/categories/bridges'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'bridge/[...bridge]',
	async ({
		params: {
			bridge: [bridge]
		}
	}) => {
		const data = await getBridgePageData(bridge)
		const {
			displayName,
			logo,
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
				logo,
				chains,
				defaultChain,
				chainToChartDataIndex,
				bridgeChartDataByChain,
				prevDayDataByChain
				// backgroundColor
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

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
