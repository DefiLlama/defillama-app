import * as React from 'react'
import PeggedContainer from '~/containers/PeggedContainer'
import { standardizeProtocolName } from '~/utils'
import { getPeggedAssetPageData, revalidate, getPeggedAssets } from '~/utils/dataApi'
import { getPeggedColor } from '~/utils/getColor'

export async function getStaticProps({
	params: {
		peggedasset: [peggedasset]
	}
}) {
	const data = await getPeggedAssetPageData(peggedasset)
	const {
		chainsUnique,
		chainCirculatings,
		stackedDataset,
		peggedAssetData,
		totalCirculating,
		unreleased,
		mcap,
		bridgeInfo,
		peggedChartType
	} = data.props
	const backgroundColor = await getPeggedColor({
		peggedAsset: peggedAssetData.name
	})
	return {
		props: {
			chainsUnique,
			chainCirculatings,
			stackedDataset,
			peggedAssetData,
			totalCirculating,
			unreleased,
			mcap,
			bridgeInfo,
			peggedChartType,
			backgroundColor
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const res = await getPeggedAssets()

	const paths = res.peggedAssets.map(({ name }) => ({
		params: { peggedasset: [standardizeProtocolName(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function PeggedAsset(props) {
	return <PeggedContainer {...props} />
}
