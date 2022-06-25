import * as React from 'react'
import PeggedContainer from '~/containers/PeggedContainer'
import { getPeggedAssetPageData, revalidate, getPeggedAssets } from '~/utils/dataApi'
import { getPeggedColor } from '~/utils/getColor'
import { standardizeProtocolName } from '~/utils'

export async function getStaticProps({
  params: {
    peggedasset: [peggedasset, cat = 'All'],
  },
}) {
  const data = await getPeggedAssetPageData(cat, peggedasset)
  const {
    chainsUnique,
    chainCirculatings,
    category,
    categories,
    stackedDataset,
    peggedAssetData,
    totalCirculating,
    unreleased,
    mcap,
    bridgeInfo,
    peggedChartType,
  } = data.props
  const backgroundColor = await getPeggedColor({ peggedAsset: peggedAssetData.name })
  return {
    props: {
      chainsUnique,
      chainCirculatings,
      category,
      categories,
      stackedDataset,
      peggedAssetData,
      totalCirculating,
      unreleased,
      mcap,
      bridgeInfo,
      peggedChartType,
      backgroundColor,
    },
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const res = await getPeggedAssets()

  const paths = res.peggedAssets.map(({ name }) => ({
    params: { peggedasset: [standardizeProtocolName(name)] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function PeggedAsset(props) {
  return <PeggedContainer {...props} />
}
