import * as React from 'react'
import PeggedContainer from '~/containers/PeggedContainer'
import { standardizeProtocolName } from '~/utils'
import { getPeggedColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import { getPeggedAssetPageData, getPeggedAssets } from '~/api/categories/stablecoins'

export async function getStaticProps({
	params: {
		peggedasset: [peggedasset]
	}
}) {
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
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	const res = await getPeggedAssets()

	const paths = res.peggedAssets.map(({ name }) => ({
		params: { peggedasset: [standardizeProtocolName(name)] }
	}))

	return { paths: paths.slice(0, 11), fallback: 'blocking' }
}

export default function PeggedAsset(props) {
	return <PeggedContainer {...props} />
}
